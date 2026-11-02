import { describe, expect, it } from "vitest";
import { getMarketChange, getPriceChange, toSparklinePoints } from "./sparkline.js";

describe("toSparklinePoints", () => {
  it("needs at least two prices", () => {
    expect(toSparklinePoints([], 100, 40)).toEqual([]);
    expect(toSparklinePoints([0.5], 100, 40)).toEqual([]);
    expect(toSparklinePoints(null, 100, 40)).toEqual([]);
  });

  it("spreads points evenly from left to right edge", () => {
    const xs = toSparklinePoints([0.2, 0.4, 0.6], 100, 40).map(([x]) => x);
    expect(xs).toEqual([0, 50, 100]);
  });

  it("puts the highest price at the top and the lowest at the bottom", () => {
    const [low, high] = toSparklinePoints([0.2, 0.8], 100, 40);
    expect(high[1]).toBe(2); // top padding
    expect(low[1]).toBe(38); // bottom padding
  });

  it("keeps a nearly flat market looking flat", () => {
    const ys = toSparklinePoints([0.5, 0.501, 0.5], 100, 40).map(([, y]) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1);
  });
});

describe("getPriceChange", () => {
  it("returns the change in percentage points, one decimal", () => {
    expect(getPriceChange([0.42, 0.5, 0.47])).toBe(5);
    expect(getPriceChange([0.6, 0.551])).toBe(-4.9);
  });

  it("returns null without enough history", () => {
    expect(getPriceChange([0.5])).toBeNull();
    expect(getPriceChange(undefined)).toBeNull();
  });
});

describe("getMarketChange", () => {
  it("prefers Polymarket's own weekly change, in points", () => {
    expect(getMarketChange({ weekChange: 0.03, sparkline: [0.1, 0.9] })).toBe(3);
    expect(getMarketChange({ weekChange: -0.125, sparkline: null })).toBe(-12.5);
    expect(getMarketChange({ weekChange: 0, sparkline: [0.1, 0.9] })).toBe(0);
  });

  it("falls back to the chart, then to nothing", () => {
    expect(getMarketChange({ weekChange: null, sparkline: [0.42, 0.47] })).toBe(5);
    expect(getMarketChange({ weekChange: null, sparkline: null })).toBe(null);
  });
});
