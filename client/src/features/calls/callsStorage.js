// Pure helpers for the calls store: reading, checking and creating calls.
// No React here, so every rule can be unit-tested.
//
// "v1" in the key is the schema version. A future v2 must read v1 and
// migrate it, never silently reuse this key with a different shape.
export const CALLS_STORAGE_KEY = "outcomex.v1.calls";

export const MODES = ["live", "practice"];
export const MIN_PROBABILITY = 0.01;
export const MAX_PROBABILITY = 0.99;
export const MAX_REASON_LENGTH = 140;

function isValidProbability(value) {
  return typeof value === "number" && value >= MIN_PROBABILITY && value <= MAX_PROBABILITY;
}

// The minimum a stored call needs to be usable
function isValidStoredCall(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.marketId === "string" &&
    item.marketId !== "" &&
    MODES.includes(item.mode) &&
    isValidProbability(item.probability)
  );
}

// Turns whatever is in localStorage into a clean list. Never throws.
// `repaired` is true when something had to be dropped, so the UI can say so.
export function parseStoredCalls(raw) {
  if (raw === null || raw === undefined) return { calls: [], repaired: false };

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { calls: [], repaired: true };
    const calls = parsed.filter(isValidStoredCall);
    return { calls, repaired: calls.length !== parsed.length };
  } catch {
    return { calls: [], repaired: true };
  }
}

// Checks a new call before it is saved. Returns an error message, or null if it's fine.
export function validateNewCall(input, existingCalls) {
  if (typeof input.marketId !== "string" || input.marketId === "") {
    return "This call is missing its market.";
  }
  if (!MODES.includes(input.mode)) {
    return "This call has an unknown mode.";
  }
  if (!isValidProbability(input.probability)) {
    return "Your call must be between 1% and 99%.";
  }
  if ((input.reason ?? "").trim().length > MAX_REASON_LENGTH) {
    return `Keep your reason to ${MAX_REASON_LENGTH} characters or fewer.`;
  }
  const duplicate = existingCalls.some(
    (call) => call.marketId === input.marketId && call.mode === input.mode,
  );
  if (duplicate) {
    return "You have already called this market. Calls are locked once made.";
  }
  return null;
}

// Builds the stored call object. `now` and `makeId` are parameters so tests
// can pass fixed values; the app uses the defaults.
export function createCall(input, { now = new Date(), makeId = () => crypto.randomUUID() } = {}) {
  return {
    id: makeId(),
    marketId: input.marketId,
    mode: input.mode,
    probability: input.probability,
    reason: (input.reason ?? "").trim(),
    question: input.question ?? "",
    createdAt: now.toISOString(),
    revealed: {
      crowdProbability: input.revealed?.crowdProbability ?? null,
      aiProbability: input.revealed?.aiProbability ?? null,
      at: now.toISOString(),
    },
    resolution: input.resolution ?? null,
  };
}
