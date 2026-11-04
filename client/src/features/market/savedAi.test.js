import { describe, expect, it } from "vitest";
import { aiForCall } from "./savedAi.js";

const callWith = (aiProbability) => ({ revealed: { crowdProbability: 0.3, aiProbability, at: "2026-11-02T10:00:00Z" } });
const current = (probability) => ({
  available: true,
  level: "model",
  probability,
  modelVersion: "lr-1",
  explanation: ["Why"],
  generatedAt: "2026-11-05T00:00:00Z",
});

describe("aiForCall", () => {
  it("keeps today's date and reasons when the number hasn't changed", () => {
    expect(aiForCall(callWith(0.37), current(0.37))).toEqual(current(0.37));
  });

  it("shows the saved number, without another estimate's reasons, after a re-run", () => {
    const shown = aiForCall(callWith(0.37), current(0.5));
    expect(shown).toMatchObject({ available: true, level: "model", probability: 0.37, explanation: [], generatedAt: null });
  });

  it("still shows the saved number when the market has left the file", () => {
    const notScored = { available: false, level: "model", probability: null, explanation: [], reason: "NOT_SCORED" };
    expect(aiForCall(callWith(0.37), notScored).probability).toBe(0.37);
    expect(aiForCall(callWith(0.37), null).probability).toBe(0.37);
  });

  it("doesn't add a number that didn't exist when you called", () => {
    expect(aiForCall(callWith(null), current(0.5))).toMatchObject({ available: false, level: "none", probability: null });
  });

  it("can still show signals, which aren't a number to compare", () => {
    const signal = { available: false, level: "signal", probability: null, explanation: ["Moved up"] };
    expect(aiForCall(callWith(null), signal)).toEqual(signal);
  });
});
