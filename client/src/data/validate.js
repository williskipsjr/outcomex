import { DataError } from "./errors.js";

// Input checks that run at the top of every data-layer function, before
// anything touches the network. Each one returns the clean value or throws
// VALIDATION_ERROR with a message the UI can show next to the input.

export const CATEGORIES = [
  "Politics",
  "Sports",
  "Crypto",
  "Economy",
  "Tech & Science",
  "World",
  "Culture",
  "Other",
];

export const RANGES = ["1d", "1w", "1m", "all"];

const MARKET_ID = /^pm-\d+$/;
const PRACTICE_ID = /^pr-\d+$/;

function invalid(message) {
  return new DataError("VALIDATION_ERROR", message);
}

// Missing means "use the default"; present but wrong is an error, not a guess
export function checkLimit(limit, { min = 1, max, fallback }) {
  if (limit === undefined || limit === null) return fallback;
  if (!Number.isInteger(limit) || limit < min || limit > max) {
    throw invalid(`limit must be a whole number from ${min} to ${max}.`);
  }
  return limit;
}

export function checkQuery(q) {
  const query = typeof q === "string" ? q.trim() : "";
  if (query.length < 2 || query.length > 80) {
    throw invalid("Search for 2 to 80 characters.");
  }
  return query;
}

export function checkMarketId(id) {
  if (typeof id !== "string" || !MARKET_ID.test(id)) {
    throw invalid("That isn't a valid market id.");
  }
  return id;
}

export function checkPracticeId(id) {
  if (typeof id !== "string" || !PRACTICE_ID.test(id)) {
    throw invalid("That isn't a valid practice id.");
  }
  return id;
}

export function checkMarketIds(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50) {
    throw invalid("Ask for 1 to 50 market ids at a time.");
  }
  ids.forEach(checkMarketId);
  return [...new Set(ids)];
}

export function checkRange(range) {
  if (!RANGES.includes(range)) {
    throw invalid(`range must be one of ${RANGES.join(", ")}.`);
  }
  return range;
}

export function checkCategory(category) {
  if (category === undefined || category === null) return null;
  if (!CATEGORIES.includes(category)) {
    throw invalid("That isn't one of our categories.");
  }
  return category;
}

// The practice reveal check (AT-15). It must be a real number, not the
// string "0.5": a tampered call from DevTools is rejected here, before the
// answers file is even requested.
export function checkProbability(probability) {
  if (typeof probability !== "number" || !Number.isFinite(probability) || probability < 0.01 || probability > 0.99) {
    throw invalid("Your call must be between 1% and 99%.");
  }
  return probability;
}
