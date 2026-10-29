import { cacheKey, createCache } from "./cache.js";
import { DataError } from "./errors.js";
import { fetchJson } from "./http.js";
import { CATEGORIES, checkCategory, checkLimit, checkMarketId, checkPracticeId, checkProbability } from "./validate.js";

// Services over the static files the ML pipeline writes into public/data:
// D5 getPrediction, D6 listPractice, D7 getPractice, D8 revealPractice.
// Each file is fetched once, its shape is checked, and it is kept 5 minutes.

const FILE_TTL = 5 * 60 * 1000;
const PRACTICE_ID = /^pr-\d+$/;

function invalidFile(name, problem) {
  console.error(`[data] ${name}: ${problem}`);
  return new DataError("INVALID_DATA", "One of OutcomeX's data files couldn't be read.");
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isProbability = (value) => typeof value === "number" && value >= 0 && value <= 1;

// ---- Shape checks: the file contracts in docs/contracts/data.md §6 ----

function checkPredictionsFile(body) {
  const name = "predictions.json";
  if (!isObject(body)) throw invalidFile(name, "not an object");
  if (body.level !== "model" && body.level !== "signal") throw invalidFile(name, `unknown level ${body.level}`);
  if (!isObject(body.predictions)) throw invalidFile(name, "predictions is missing");
  return {
    modelVersion: typeof body.modelVersion === "string" ? body.modelVersion : null,
    level: body.level,
    generatedAt: typeof body.generatedAt === "string" ? body.generatedAt : null,
    predictions: body.predictions,
  };
}

// Copies only the contract's fields, so an answer can never leak through the
// list even if one slips into the file by mistake. Items that can't be read
// are skipped; a file that isn't a list at all is an error.
function checkPracticeList(body) {
  const name = "practice-list.json";
  if (!isObject(body) || !Array.isArray(body.items)) throw invalidFile(name, "items is missing");
  const items = [];
  for (const item of body.items) {
    const readable =
      isObject(item) &&
      PRACTICE_ID.test(item.id) &&
      typeof item.question === "string" &&
      typeof item.asOfDate === "string" &&
      typeof item.closedDate === "string";
    if (!readable) {
      console.error(`[data] ${name}: skipped an unreadable item`, item);
      continue;
    }
    items.push({
      id: item.id,
      question: item.question,
      description: typeof item.description === "string" ? item.description : "",
      category: CATEGORIES.includes(item.category) ? item.category : "Other",
      imageUrl: typeof item.imageUrl === "string" && item.imageUrl !== "" ? item.imageUrl : null,
      asOfDate: item.asOfDate,
      closedDate: item.closedDate,
    });
  }
  return items;
}

function checkAnswersFile(body) {
  if (!isObject(body) || !isObject(body.answers)) throw invalidFile("practice-answers.json", "answers is missing");
  return body.answers;
}

function toReveal(id, answer) {
  const readable =
    isObject(answer) &&
    (answer.outcome === "YES" || answer.outcome === "NO") &&
    isProbability(answer.crowdProbabilityAsOf);
  if (!readable) throw invalidFile("practice-answers.json", `unreadable answer for ${id}`);

  const hasAi = isProbability(answer.aiProbability);
  return {
    id,
    outcome: answer.outcome,
    crowdProbabilityAsOf: answer.crowdProbabilityAsOf,
    ai: {
      available: hasAi,
      probability: hasAi ? answer.aiProbability : null,
      modelVersion: hasAi && typeof answer.modelVersion === "string" ? answer.modelVersion : null,
    },
    resolvedAt: typeof answer.resolvedAt === "string" ? answer.resolvedAt : null,
  };
}

// ---- Predictions: always an answer, never an error, for a valid id ----

function noPrediction(marketId, level, reason, generatedAt = null) {
  return { marketId, available: false, level, probability: null, modelVersion: null, explanation: [], generatedAt, reason };
}

export function toPrediction(marketId, file) {
  const entry = file.predictions[marketId];
  if (!isObject(entry)) return noPrediction(marketId, file.level, "NOT_SCORED", file.generatedAt);

  const explanation = Array.isArray(entry.explanation)
    ? entry.explanation.filter((line) => typeof line === "string").slice(0, 3)
    : [];
  const available = file.level === "model" && isProbability(entry.probability);
  return {
    marketId,
    available,
    level: file.level,
    probability: available ? entry.probability : null,
    modelVersion: file.modelVersion,
    explanation,
    generatedAt: file.generatedAt,
    reason: null,
  };
}

export function createFilesApi({
  fetchImpl = (...args) => globalThis.fetch(...args),
  cache = createCache(),
  baseUrl = "/data",
} = {}) {
  function loadFile(name, check, signal) {
    return cache.get(
      cacheKey("file", name),
      FILE_TTL,
      async (sharedSignal) => {
        let body;
        try {
          body = await fetchJson(`${baseUrl}/${name}`, { signal: sharedSignal, fetchImpl, what: "OutcomeX's data files" });
        } catch (error) {
          // A missing file is a broken deployment, not an unknown market
          if (error.code === "NOT_FOUND") {
            throw new DataError("UPSTREAM_UNAVAILABLE", "One of OutcomeX's data files is missing.", { status: 404 });
          }
          throw error;
        }
        return check(body);
      },
      { signal, source: name },
    );
  }

  // D5
  async function getPrediction(id, { signal } = {}) {
    const marketId = checkMarketId(id);
    try {
      const { data: file, meta } = await loadFile("predictions.json", checkPredictionsFile, signal);
      return { data: toPrediction(marketId, file), meta };
    } catch (error) {
      if (error.code === "ABORTED") throw error;
      // No file (Level C) or a broken one: the reveal shows "AI not available"
      return {
        data: noPrediction(marketId, "none", "ML_DISABLED"),
        meta: { fetchedAt: null, stale: false, cache: "miss", source: "predictions.json" },
      };
    }
  }

  // D6
  async function listPractice({ limit, category, signal } = {}) {
    const count = checkLimit(limit, { max: 200, fallback: 200 });
    const wanted = checkCategory(category);
    const { data: items, meta } = await loadFile("practice-list.json", checkPracticeList, signal);
    const matching = wanted ? items.filter((item) => item.category === wanted) : items;
    return { data: matching.slice(0, count), meta };
  }

  // D7
  async function getPractice(id, { signal } = {}) {
    const practiceId = checkPracticeId(id);
    const { data: items, meta } = await loadFile("practice-list.json", checkPracticeList, signal);
    const item = items.find((candidate) => candidate.id === practiceId);
    if (!item) throw new DataError("NOT_FOUND", "We couldn't find that practice market.");
    return { data: item, meta };
  }

  // D8. The probability is checked BEFORE the answers file is requested
  // (AT-15). Loading it only after a valid call is a courtesy, not security:
  // the file is public and anyone can open it in DevTools.
  async function revealPractice(id, probability, { signal } = {}) {
    const practiceId = checkPracticeId(id);
    checkProbability(probability);
    const { data: answers, meta } = await loadFile("practice-answers.json", checkAnswersFile, signal);
    if (!(practiceId in answers)) throw new DataError("NOT_FOUND", "We couldn't find the answer to that practice market.");
    return { data: toReveal(practiceId, answers[practiceId]), meta };
  }

  return { getPrediction, listPractice, getPractice, revealPractice };
}

export const { getPrediction, listPractice, getPractice, revealPractice } = createFilesApi();
