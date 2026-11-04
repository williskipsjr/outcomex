// What the reveal shows for the AI once a call is locked. A call is scored
// against the AI number saved with it, and predictions.json is regenerated
// regularly, so the current file can't be trusted for an old call: its number
// may have changed, or the market may have dropped out of it.
//
// call: the saved call. current: today's Prediction for this market, or null.
export function aiForCall(call, current) {
  const saved = call.revealed.aiProbability ?? null;

  if (saved === null) {
    // There was no AI number when you called, so there's none to compare with now.
    // Signals aren't a number to compare, so they can still be shown.
    if (current?.level === "signal") return current;
    return { available: false, level: "none", probability: null, modelVersion: null, explanation: [], generatedAt: null };
  }

  // Same number as today's file: its date and explanation still describe it
  if (current?.available && current.probability === saved) return current;

  // A different estimate is in the file now, so its date and reasons don't apply
  return { available: true, level: "model", probability: saved, modelVersion: null, explanation: [], generatedAt: null };
}
