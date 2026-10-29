import { describe, expect, it } from "vitest";
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

const code = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return error.code;
  }
};

describe("checkLimit", () => {
  it("uses the default when missing and rejects bad values", () => {
    expect(checkLimit(undefined, { max: 200, fallback: 100 })).toBe(100);
    expect(checkLimit(50, { max: 200, fallback: 100 })).toBe(50);
    expect(code(() => checkLimit(0, { max: 200, fallback: 100 }))).toBe("VALIDATION_ERROR");
    expect(code(() => checkLimit(201, { max: 200, fallback: 100 }))).toBe("VALIDATION_ERROR");
    expect(code(() => checkLimit(2.5, { max: 200, fallback: 100 }))).toBe("VALIDATION_ERROR");
    expect(code(() => checkLimit("10", { max: 200, fallback: 100 }))).toBe("VALIDATION_ERROR");
  });
});

describe("checkQuery", () => {
  it("trims and needs 2 to 80 characters", () => {
    expect(checkQuery("  fed  ")).toBe("fed");
    expect(code(() => checkQuery(" a "))).toBe("VALIDATION_ERROR");
    expect(code(() => checkQuery("x".repeat(81)))).toBe("VALIDATION_ERROR");
    expect(code(() => checkQuery(undefined))).toBe("VALIDATION_ERROR");
  });
});

describe("ids", () => {
  it("accepts only prefixed numeric ids", () => {
    expect(checkMarketId("pm-665374")).toBe("pm-665374");
    expect(code(() => checkMarketId("665374"))).toBe("VALIDATION_ERROR");
    expect(code(() => checkMarketId("pm-abc"))).toBe("VALIDATION_ERROR");
    expect(code(() => checkMarketId("pr-1"))).toBe("VALIDATION_ERROR");
    expect(checkPracticeId("pr-558938")).toBe("pr-558938");
    expect(code(() => checkPracticeId("pm-558938"))).toBe("VALIDATION_ERROR");
  });

  it("takes 1 to 50 ids and drops duplicates", () => {
    expect(checkMarketIds(["pm-1", "pm-2", "pm-1"])).toEqual(["pm-1", "pm-2"]);
    expect(code(() => checkMarketIds([]))).toBe("VALIDATION_ERROR");
    expect(code(() => checkMarketIds(Array.from({ length: 51 }, (_, i) => `pm-${i}`)))).toBe("VALIDATION_ERROR");
    expect(code(() => checkMarketIds(["pm-1", "bad"]))).toBe("VALIDATION_ERROR");
  });
});

describe("checkRange and checkCategory", () => {
  it("only allows known values", () => {
    expect(checkRange("1w")).toBe("1w");
    expect(code(() => checkRange("1y"))).toBe("VALIDATION_ERROR");
    expect(checkCategory(undefined)).toBe(null);
    expect(checkCategory("Tech & Science")).toBe("Tech & Science");
    expect(code(() => checkCategory("crypto"))).toBe("VALIDATION_ERROR");
  });
});

describe("checkProbability (AT-15)", () => {
  it("accepts 0.01 to 0.99 as a number", () => {
    expect(checkProbability(0.01)).toBe(0.01);
    expect(checkProbability(0.99)).toBe(0.99);
  });

  it("rejects tampered values", () => {
    for (const bad of [1.5, 0, 1, 0.005, -0.2, "0.5", NaN, Infinity, null, undefined]) {
      expect(code(() => checkProbability(bad))).toBe("VALIDATION_ERROR");
    }
  });
});
