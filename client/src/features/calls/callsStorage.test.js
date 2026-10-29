import { describe, expect, it } from "vitest";
import { createCall, parseStoredCalls, validateNewCall } from "./callsStorage.js";

const good = { marketId: "pm-1", mode: "live", probability: 0.62 };

describe("parseStoredCalls", () => {
  it("starts empty when nothing is stored", () => {
    expect(parseStoredCalls(null)).toEqual({ calls: [], repaired: false });
  });

  it("keeps valid calls untouched", () => {
    const result = parseStoredCalls(JSON.stringify([good]));
    expect(result).toEqual({ calls: [good], repaired: false });
  });

  it("drops broken items and reports the repair", () => {
    const raw = JSON.stringify([
      good,
      { marketId: "pm-2", mode: "live", probability: 1.5 },
      { marketId: "", mode: "live", probability: 0.5 },
      { marketId: "pm-3", mode: "banana", probability: 0.5 },
      null,
    ]);
    expect(parseStoredCalls(raw)).toEqual({ calls: [good], repaired: true });
  });

  it("survives broken JSON and non-arrays", () => {
    expect(parseStoredCalls("{broken")).toEqual({ calls: [], repaired: true });
    expect(parseStoredCalls('{"a":1}')).toEqual({ calls: [], repaired: true });
  });
});

describe("validateNewCall", () => {
  it("accepts a good call", () => {
    expect(validateNewCall({ ...good, reason: "Polls moved" }, [])).toBeNull();
  });

  it("rejects probabilities outside 1-99%", () => {
    expect(validateNewCall({ ...good, probability: 0 }, [])).toMatch(/1% and 99%/);
    expect(validateNewCall({ ...good, probability: 1 }, [])).toMatch(/1% and 99%/);
    expect(validateNewCall({ ...good, probability: "0.5" }, [])).toMatch(/1% and 99%/);
  });

  it("allows exactly 1% and 99%", () => {
    expect(validateNewCall({ ...good, probability: 0.01 }, [])).toBeNull();
    expect(validateNewCall({ ...good, probability: 0.99 }, [])).toBeNull();
  });

  it("rejects reasons over 140 characters (after trimming)", () => {
    expect(validateNewCall({ ...good, reason: "a".repeat(141) }, [])).toMatch(/140/);
    expect(validateNewCall({ ...good, reason: `  ${"a".repeat(140)}  ` }, [])).toBeNull();
  });

  it("rejects a second call on the same market and mode", () => {
    expect(validateNewCall(good, [good])).toMatch(/already called/);
    expect(validateNewCall({ ...good, mode: "practice" }, [good])).toBeNull();
  });
});

describe("createCall", () => {
  it("builds the stored shape with a trimmed reason and reveal snapshot", () => {
    const call = createCall(
      { ...good, reason: "  Polls moved  ", question: "Q?", revealed: { crowdProbability: 0.55 } },
      { now: new Date("2026-11-10T09:01:00Z"), makeId: () => "id-1" },
    );
    expect(call).toEqual({
      id: "id-1",
      marketId: "pm-1",
      mode: "live",
      probability: 0.62,
      reason: "Polls moved",
      question: "Q?",
      createdAt: "2026-11-10T09:01:00.000Z",
      revealed: { crowdProbability: 0.55, aiProbability: null, at: "2026-11-10T09:01:00.000Z" },
      resolution: null,
    });
  });
});
