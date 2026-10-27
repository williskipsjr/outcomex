import { describe, expect, it } from "vitest";
import { formatPercent } from "./format.js";

describe("formatPercent", () => {
  it("turns a decimal into a rounded percentage", () => {
    expect(formatPercent(0.714)).toBe("71%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("shows a dash when there is no value", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });
});
