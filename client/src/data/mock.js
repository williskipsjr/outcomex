import { DataError, ERROR_CODES, abortedError } from "./errors.js";
import { toPrediction } from "./files.js";
import { sparklineFrom } from "./normalize.js";
import {
  checkCategory,
  checkLimit,
  checkMarketId,
  checkMarketIds,
  checkPracticeId,
  checkProbability,
  checkQuery,
  checkRange,
} from "./validate.js";
import { EDGE_CASE_DETAILS, edgeCaseHistory, edgeCaseMarkets } from "../mocks/edgeCases.js";

// Mock mode (VITE_USE_MOCKS=true): the same functions, inputs, checks,
// results and error codes as the real data layer, served from the fixtures
// in src/mocks after a random 300–900 ms, so every loading state is visible.
//
// Failure switch, in DevTools (docs/contracts/data.md §7):
//   localStorage.setItem("outcomex.debug.fail", "RATE_LIMITED")      everything fails with that code
//   localStorage.setItem("outcomex.debug.fail", "markets,history")    only those groups fail
//   localStorage.setItem("outcomex.debug.fail", "history:UPSTREAM_TIMEOUT")
// AI level switch, to see all three reveal states:
//   localStorage.setItem("outcomex.debug.aiLevel", "signal")          or "none"

const GROUPS = ["markets", "search", "history", "prediction", "practice", "statuses"];

function readSetting(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

// Which code, if any, this group should fail with right now
export function failureFor(group, setting = readSetting("outcomex.debug.fail")) {
  if (!setting) return null;
  for (const part of setting.split(",").map((piece) => piece.trim())) {
    if (ERROR_CODES.includes(part)) return part;
    const [name, code] = part.split(":");
    if (name === group && GROUPS.includes(name)) {
      return ERROR_CODES.includes(code) ? code : "UPSTREAM_UNAVAILABLE";
    }
  }
  return null;
}

const MESSAGES = {
  NOT_FOUND: "We couldn't find that market.",
  RATE_LIMITED: "Too many requests. Try again in a moment.",
  UPSTREAM_UNAVAILABLE: "Polymarket isn't responding right now.",
  UPSTREAM_TIMEOUT: "Polymarket is taking too long to answer.",
  INVALID_DATA: "We got data we couldn't read.",
  VALIDATION_ERROR: "That doesn't look right.",
  ABORTED: "Request cancelled",
};

const iso = (time) => new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");

// Waits like a network call, honours the signal and the failure switch, then
// runs `produce` (which may throw a DataError of its own)
function respond(group, produce, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortedError());
      return;
    }
    const delay = 300 + Math.random() * 600;
    const timer = setTimeout(async () => {
      signal?.removeEventListener("abort", onAbort);
      const code = failureFor(group);
      if (code) {
        reject(new DataError(code, MESSAGES[code] + " (simulated: outcomex.debug.fail)"));
        return;
      }
      try {
        const data = await produce();
        resolve({ data, meta: { fetchedAt: iso(Date.now()), stale: false, cache: "miss", source: "mock" } });
      } catch (error) {
        reject(error);
      }
    }, delay);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// The fixtures are loaded only when a mock function first needs them
// (dynamic import), so they never end up in the real app's main bundle
let fixtures = null;
async function loadFixtures() {
  if (!fixtures) {
    const [markets, details, sparklines, history, searchPool, predictions, practiceList, practiceAnswers] = await Promise.all([
      import("../mocks/markets.json"),
      import("../mocks/marketDetails.json"),
      import("../mocks/sparklines.json"),
      import("../mocks/history.json"),
      import("../mocks/searchPool.json"),
      import("../mocks/predictions.json"),
      import("../mocks/practice-list.json"),
      import("../mocks/practice-answers.json"),
    ]).then((modules) => modules.map((module) => module.default));
    const now = Date.now();
    const listed = [...markets, ...edgeCaseMarkets(now)];
    fixtures = {
      listed,
      all: [...listed, ...searchPool],
      details: { ...details, ...EDGE_CASE_DETAILS },
      sparklines,
      history: { ...history, ...edgeCaseHistory(now) },
      predictions,
      practiceList,
      practiceAnswers,
    };
  }
  return fixtures;
}

const notFound = (what = "market") => new DataError("NOT_FOUND", `We couldn't find that ${what}.`);

async function findMarket(id) {
  const { all } = await loadFixtures();
  const market = all.find((candidate) => candidate.id === id);
  if (!market) throw notFound();
  return market;
}

// D1
export async function listMarkets({ limit, signal } = {}) {
  const count = checkLimit(limit, { max: 200, fallback: 100 });
  return respond("markets", async () => (await loadFixtures()).listed.filter((m) => m.status === "open").slice(0, count), signal);
}

// D2: a substring search over every fixture market
export async function searchMarkets({ q, limit, signal } = {}) {
  const query = checkQuery(q).toLowerCase();
  const count = checkLimit(limit, { max: 50, fallback: 20 });
  return respond(
    "search",
    async () =>
      (await loadFixtures()).all
        .filter((market) => market.status === "open" && market.question.toLowerCase().includes(query))
        .slice(0, count),
    signal,
  );
}

// D3
export async function getMarket(id, { signal } = {}) {
  checkMarketId(id);
  return respond(
    "markets",
    async () => {
      const market = await findMarket(id);
      const extra = (await loadFixtures()).details[id] ?? { description: "", startDate: null };
      return { ...market, ...extra };
    },
    signal,
  );
}

// D4. Only some markets have a saved history; the rest have a flat line at
// their current price, which is honest enough for building the chart.
export async function getHistory(id, range, { signal } = {}) {
  checkMarketId(id);
  checkRange(range);
  return respond(
    "history",
    async () => {
      const market = await findMarket(id);
      const saved = (await loadFixtures()).history[id]?.[range];
      let points;
      if (saved) {
        points = saved.map(([seconds, p]) => ({ t: iso(seconds * 1000), p }));
      } else if (market.crowdProbability === null) {
        points = [];
      } else {
        const spanMs = { "1d": 1, "1w": 7, "1m": 30, all: 90 }[range] * 24 * 60 * 60 * 1000;
        points = [
          { t: iso(Date.now() - spanMs), p: market.crowdProbability },
          { t: iso(Date.now()), p: market.crowdProbability },
        ];
      }
      return { range, points };
    },
    signal,
  );
}

// D5
export async function getPrediction(id, { signal } = {}) {
  checkMarketId(id);
  return respond(
    "prediction",
    async () => {
      const { predictions } = await loadFixtures();
      const level = readSetting("outcomex.debug.aiLevel");
      if (level === "none") {
        return { marketId: id, available: false, level: "none", probability: null, modelVersion: null, explanation: [], generatedAt: null, reason: "ML_DISABLED" };
      }
      if (level === "signal") {
        const signals = { ...predictions, level: "signal" };
        const entry = predictions.predictions[id];
        signals.predictions = entry ? { [id]: { probability: null, explanation: ["Mock signal: price rose 4 points in 7 days"] } } : {};
        return toPrediction(id, signals);
      }
      return toPrediction(id, predictions);
    },
    signal,
  );
}

// D6
export async function listPractice({ limit, category, signal } = {}) {
  const count = checkLimit(limit, { max: 200, fallback: 200 });
  const wanted = checkCategory(category);
  return respond(
    "practice",
    async () => {
      const { items } = (await loadFixtures()).practiceList;
      return (wanted ? items.filter((item) => item.category === wanted) : items).slice(0, count);
    },
    signal,
  );
}

// D7
export async function getPractice(id, { signal } = {}) {
  checkPracticeId(id);
  return respond(
    "practice",
    async () => {
      const item = (await loadFixtures()).practiceList.items.find((candidate) => candidate.id === id);
      if (!item) throw notFound("practice market");
      return item;
    },
    signal,
  );
}

// D8: the same check-first rule as the real one
export async function revealPractice(id, probability, { signal } = {}) {
  checkPracticeId(id);
  checkProbability(probability);
  return respond(
    "practice",
    async () => {
      const answer = (await loadFixtures()).practiceAnswers.answers[id];
      if (!answer) throw notFound("practice answer");
      const hasAi = typeof answer.aiProbability === "number";
      return {
        id,
        outcome: answer.outcome,
        crowdProbabilityAsOf: answer.crowdProbabilityAsOf,
        ai: { available: hasAi, probability: hasAi ? answer.aiProbability : null, modelVersion: hasAi ? answer.modelVersion : null },
        resolvedAt: answer.resolvedAt,
      };
    },
    signal,
  );
}

// D9
export async function getStatuses(ids, { signal } = {}) {
  const unique = checkMarketIds(ids);
  return respond(
    "statuses",
    async () => {
      const { all } = await loadFixtures();
      return unique
        .map((id) => all.find((market) => market.id === id))
        .filter(Boolean)
        .map((market) => ({ id: market.id, status: market.status, outcome: market.outcome }));
    },
    signal,
  );
}

// D10
export async function checkSources() {
  return {
    data: [{ name: "Mock fixtures", ok: true, detail: "Mock mode is on (VITE_USE_MOCKS=true)" }],
    meta: { fetchedAt: iso(Date.now()), stale: false, cache: "miss", source: "mock" },
  };
}

// D11
export async function getSparklines(ids, { signal } = {}) {
  const unique = checkMarketIds(ids);
  return respond(
    "history",
    async () => {
      const { sparklines, history } = await loadFixtures();
      const lines = {};
      for (const id of unique) {
        if (sparklines[id]) lines[id] = sparklines[id];
        else if (history[id]?.["1w"]) lines[id] = sparklineFrom(history[id]["1w"].map(([, p]) => ({ p })));
      }
      return lines;
    },
    signal,
  );
}
