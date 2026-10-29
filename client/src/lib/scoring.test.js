import { describe, expect, it } from "vitest";
import {
  accuracyFromBrier,
  brierScore,
  calibrationBuckets,
  compareForecasts,
  meanBrier,
} from "./scoring.js";

describe("brierScore", () => {
  it("is (p - o)^2", () => {
    expect(brierScore(0.7, "YES")).toBeCloseTo(0.09);
    expect(brierScore(0.7, "NO")).toBeCloseTo(0.49);
    expect(brierScore(0.5, "YES")).toBeCloseTo(0.25);
  });

  it("handles the extremes the form allows (1% and 99%)", () => {
    expect(brierScore(0.99, "YES")).toBeCloseTo(0.0001);
    expect(brierScore(0.01, "YES")).toBeCloseTo(0.9801);
    expect(brierScore(0.01, "NO")).toBeCloseTo(0.0001);
  });
});

describe("accuracyFromBrier", () => {
  it("maps Brier to a rounded 0-100 number", () => {
    expect(accuracyFromBrier(0)).toBe(100);
    expect(accuracyFromBrier(0.25)).toBe(75);
    expect(accuracyFromBrier(0.09)).toBe(91);
    expect(accuracyFromBrier(1)).toBe(0);
  });
});

describe("meanBrier", () => {
  it("averages", () => {
    const forecasts = [
      { probability: 0.7, outcome: "YES" }, // 0.09
      { probability: 0.7, outcome: "NO" }, // 0.49
    ];
    expect(meanBrier(forecasts)).toBeCloseTo(0.29);
  });

  it("returns null, not NaN, for no forecasts", () => {
    expect(meanBrier([])).toBeNull();
  });
});

function call({ p, crowd, ai = null, outcome = "YES", mode = "live" }) {
  return {
    probability: p,
    mode,
    revealed: { crowdProbability: crowd, aiProbability: ai },
    resolution: outcome ? { outcome } : null,
  };
}

describe("compareForecasts", () => {
  it("compares you and the crowd on the same resolved calls", () => {
    const result = compareForecasts([
      call({ p: 0.8, crowd: 0.6, outcome: "YES" }),
      call({ p: 0.2, crowd: 0.4, outcome: "NO" }),
      call({ p: 0.9, crowd: 0.9, outcome: null }), // not resolved: ignored
    ]);
    expect(result.you.n).toBe(2);
    expect(result.you.brier).toBeCloseTo(0.04);
    expect(result.crowd.brier).toBeCloseTo(0.16);
    expect(result.you.accuracy).toBe(96);
    expect(result.crowd.accuracy).toBe(84);
  });

  it("scores the AI only where it had a number, with its own n", () => {
    const result = compareForecasts([
      call({ p: 0.8, crowd: 0.6, ai: 0.7, outcome: "YES" }),
      call({ p: 0.2, crowd: 0.4, ai: null, outcome: "NO" }),
    ]);
    expect(result.ai.n).toBe(1);
    expect(result.ai.brier).toBeCloseTo(0.09);
    expect(result.youOnAiCalls.n).toBe(1);
    expect(result.youOnAiCalls.brier).toBeCloseTo(0.04);
  });

  it("mixes live and practice calls", () => {
    const result = compareForecasts([
      call({ p: 0.6, crowd: 0.5, mode: "live" }),
      call({ p: 0.6, crowd: 0.5, mode: "practice" }),
    ]);
    expect(result.you.n).toBe(2);
  });

  it("says when there isn't enough data yet", () => {
    const empty = compareForecasts([]);
    expect(empty.enoughData).toBe(false);
    expect(empty.you.brier).toBeNull();
    expect(empty.ai.accuracy).toBeNull();
    const five = compareForecasts(Array.from({ length: 5 }, () => call({ p: 0.5, crowd: 0.5 })));
    expect(five.enoughData).toBe(true);
  });
});

describe("calibrationBuckets", () => {
  it("groups forecasts into 10 buckets", () => {
    const buckets = calibrationBuckets([
      { probability: 0.72, outcome: "YES" },
      { probability: 0.78, outcome: "NO" },
      { probability: 0.99, outcome: "YES" },
    ]);
    expect(buckets).toHaveLength(10);
    expect(buckets[7].count).toBe(2);
    expect(buckets[7].meanForecast).toBeCloseTo(0.75);
    expect(buckets[7].yesRate).toBe(0.5);
    expect(buckets[9].count).toBe(1);
    expect(buckets[0].meanForecast).toBeNull();
  });
});
