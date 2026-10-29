import { readDebugFailure, simulateFailure, simulateRequest } from "../../lib/simulateRequest.js";
import { SAMPLE_MARKETS } from "../dashboard/sampleMarkets.js";
import { REMOTE_POOL } from "../dashboard/sampleSearch.js";
import practiceSnapshot from "../practice-list/practiceSnapshot.json";

// TEMPORARY stand-ins for the data layer's detail functions (D3, D4, D5, D7,
// D8 in the contract). Same inputs, same { data, meta } results and the same
// DataError codes, so swapping in the real ones later is one import change.

const ALL_MARKETS = [...SAMPLE_MARKETS, ...REMOTE_POOL];
// The live snapshot was taken on this date; the 1W history ends here
const SNAPSHOT_TIME = new Date("2026-10-28T12:00:00Z").getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The bigger files are loaded only when a detail page needs them
// (dynamic import: Vite puts them in their own small chunks)
const loadDetails = () => import("./marketDetails.json").then((module) => module.default);
const loadHistory = () => import("./marketHistory.json").then((module) => module.default);
const loadPracticeDetails = () => import("./practiceDetails.json").then((module) => module.default);

// D3: getMarket(id) -> MarketDetail (Market + description + startDate)
export async function getSampleMarket(id, { signal } = {}) {
  const market = ALL_MARKETS.find((item) => item.id === id);
  if (!market) return simulateFailure("NOT_FOUND", `No market with id ${id}`, signal);

  const details = await loadDetails();
  const extra = details[id] ?? { description: "", startDate: null };
  return simulateRequest({ ...market, ...extra }, signal);
}

// D4: getHistory(id, range) -> { range, points: [{ t, p }] }
export async function getSampleHistory(id, range, { signal } = {}) {
  const market = ALL_MARKETS.find((item) => item.id === id);
  if (!market) return simulateFailure("NOT_FOUND", `No market with id ${id}`, signal);

  let points;
  if (range === "1w") {
    // The card sparkline is the last week; spread it evenly over 7 days
    const prices = market.sparkline ?? [];
    points = prices.map((p, index) => ({
      t: new Date(SNAPSHOT_TIME - WEEK_MS + (index / Math.max(prices.length - 1, 1)) * WEEK_MS).toISOString(),
      p,
    }));
  } else {
    const history = await loadHistory();
    // Stored compactly as [unix seconds, price]; the contract wants { t: ISO, p }
    points = (history[id]?.[range] ?? []).map(([seconds, p]) => ({
      t: new Date(seconds * 1000).toISOString(),
      p,
    }));
  }
  return simulateRequest({ range, points }, signal, { delayMs: 350 });
}

// Reads a JSON file from public/data, turning every failure into a DataError
async function fetchStaticJson(path, signal) {
  const failCode = readDebugFailure();
  if (failCode) throw { code: failCode, message: "Simulated failure (outcomex.debug.fail)" };

  let response;
  try {
    response = await fetch(path, { signal });
  } catch (error) {
    if (error.name === "AbortError") throw { code: "ABORTED", message: "Request cancelled" };
    throw { code: "UPSTREAM_UNAVAILABLE", message: "Couldn't load " + path };
  }
  if (!response.ok) throw { code: "UPSTREAM_UNAVAILABLE", message: `${path} returned ${response.status}` };
  try {
    return await response.json();
  } catch {
    throw { code: "INVALID_DATA", message: `${path} is not valid JSON` };
  }
}

const NO_PREDICTION = { available: false, level: "none", probability: null, modelVersion: null, explanation: [], reason: "NOT_SCORED" };

// D5: getPrediction(id) -> Prediction (a structured "not available" when there is none)
export async function getSamplePrediction(id, { signal } = {}) {
  const file = await fetchStaticJson("/data/predictions.json", signal);
  const prediction = file.predictions?.[id] ?? NO_PREDICTION;
  return { data: { marketId: id, generatedAt: file.generatedAt ?? null, ...prediction }, meta: { source: "predictions.json" } };
}

// D7: getPractice(id) -> PracticeMarket, still without the answer
export async function getSamplePractice(id, { signal } = {}) {
  const market = practiceSnapshot.find((item) => item.id === id);
  if (!market) return simulateFailure("NOT_FOUND", `No practice market with id ${id}`, signal);

  const details = await loadPracticeDetails();
  return simulateRequest({ ...market, description: details[id]?.description ?? "" }, signal);
}

// D8: revealPractice(id, probability) -> Reveal. The answers file is only
// fetched after a valid call. That's a courtesy, not security: the file is
// public and anyone can open it in DevTools. Fine for a learning game.
export async function revealSamplePractice(id, probability, { signal } = {}) {
  if (typeof probability !== "number" || probability < 0.01 || probability > 0.99) {
    throw { code: "VALIDATION_ERROR", message: "Your call must be between 1% and 99%." };
  }
  const answers = await fetchStaticJson("/data/practice-answers.json", signal);
  const answer = answers[id];
  if (!answer) throw { code: "NOT_FOUND", message: `No answer for ${id}` };

  return {
    data: {
      id,
      outcome: answer.outcome,
      crowdProbabilityAsOf: answer.crowdProbabilityAsOf,
      resolvedAt: answer.resolvedAt,
      ai: { available: false, probability: null, modelVersion: null },
    },
    meta: { source: "practice-answers.json" },
  };
}
