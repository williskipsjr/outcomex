import { describe, expect, it } from "vitest";
import { parsePercentInput } from "./callInput.js";
import { describeDifference } from "./reveal.js";

describe("parsePercentInput", () => {
  it("accepts whole numbers from 1 to 99", () => {
    expect(parsePercentInput("62")).toEqual({ percent: 62, error: null });
    expect(parsePercentInput(" 1 ")).toEqual({ percent: 1, error: null });
    expect(parsePercentInput("99")).toEqual({ percent: 99, error: null });
  });

  it("rejects empty, non-numbers, decimals and out-of-range values", () => {
    expect(parsePercentInput("").error).toMatch(/1 to 99/);
    expect(parsePercentInput("abc").error).toMatch(/isn't a number/);
    expect(parsePercentInput("62.5").error).toMatch(/whole number/);
    expect(parsePercentInput("0").error).toMatch(/1 to 99/);
    expect(parsePercentInput("100").error).toMatch(/1 to 99/);
  });
});

describe("describeDifference", () => {
  it("agrees when under 5 points apart", () => {
    expect(describeDifference(0.62, 0.6)).toBe("You agree with the crowd.");
    expect(describeDifference(0.56, 0.6)).toBe("You agree with the crowd.");
  });

  it("says how many points more or less confident", () => {
    expect(describeDifference(0.8, 0.6)).toBe("You are 20 points more confident in YES than the crowd.");
    expect(describeDifference(0.3, 0.6)).toBe("You are 30 points less confident in YES than the crowd.");
  });

  it("returns null without a crowd number", () => {
    expect(describeDifference(0.5, null)).toBeNull();
  });
});
