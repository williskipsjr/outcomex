import { describe, expect, it } from "vitest";
import { chartGeometry, summarizeSeries, toPolyline } from "./chart.js";

const box = { width: 100, height: 100, left: 0, right: 0, top: 0, bottom: 0 };

describe("chartGeometry", () => {
  it("maps 100% to the top and 0% to the bottom", () => {
    const { y } = chartGeometry(box);
    expect(y(1)).toBe(0);
    expect(y(0)).toBe(100);
    expect(y(0.25)).toBe(75);
  });

  it("respects padding for the axis labels", () => {
    const { y, x } = chartGeometry({ width: 140, height: 120, left: 40, right: 0, top: 10, bottom: 10 });
    expect(y(1)).toBe(10);
    expect(y(0)).toBe(110);
    expect(x(0, 3)).toBe(40);
    expect(x(2, 3)).toBe(140);
  });
});

describe("toPolyline", () => {
  it("turns points into an SVG points string", () => {
    expect(toPolyline([{ p: 0.5 }, { p: 1 }], box)).toBe("0.0,50.0 100.0,0.0");
  });
});

describe("summarizeSeries", () => {
  it("reports start, end, min and max", () => {
    expect(summarizeSeries([{ p: 0.4 }, { p: 0.7 }, { p: 0.55 }])).toEqual({
      start: 0.4,
      end: 0.55,
      min: 0.4,
      max: 0.7,
    });
    expect(summarizeSeries([])).toBeNull();
  });
});
