import { describe, expect, it } from "vitest";
import { getClosingSoon, getFeatured, getMostTraded, getTopMovers } from "./rankings.js";

const NOW = new Date("2026-10-28T00:00:00Z").getTime();

function market(overrides) {
  return {
    id: "pm-1",
    status: "open",
    endDate: "2026-12-31T00:00:00Z",
    crowdProbability: 0.5,
    volume: 100,
    sparkline: [0.5, 0.5],
    ...overrides,
  };
}

const ids = (list) => list.map((m) => m.id);

describe("getFeatured", () => {
  it("takes the highest-volume markets that have a price", () => {
    const markets = [
      market({ id: "a", volume: 10 }),
      market({ id: "b", volume: 30, crowdProbability: null }),
      market({ id: "c", volume: 20 }),
    ];
    expect(ids(getFeatured(markets, 2))).toEqual(["c", "a"]);
  });
});

describe("getClosingSoon", () => {
  it("orders open markets by end date and skips ones already closed", () => {
    const markets = [
      market({ id: "later", endDate: "2026-12-01T00:00:00Z" }),
      market({ id: "past", endDate: "2026-10-01T00:00:00Z" }),
      market({ id: "soon", endDate: "2026-11-01T00:00:00Z" }),
    ];
    expect(ids(getClosingSoon(markets, 4, NOW))).toEqual(["soon", "later"]);
  });
});

describe("getMostTraded", () => {
  it("orders by volume, highest first, without changing the input", () => {
    const markets = [market({ id: "a", volume: 1 }), market({ id: "b", volume: 2 })];
    expect(ids(getMostTraded(markets))).toEqual(["b", "a"]);
    expect(ids(markets)).toEqual(["a", "b"]);
  });
});

describe("getTopMovers", () => {
  it("ranks by the size of the move, up or down", () => {
    const markets = [
      market({ id: "small", sparkline: [0.5, 0.52] }),
      market({ id: "drop", sparkline: [0.6, 0.4] }),
      market({ id: "flat", sparkline: [0.5, 0.5] }),
      market({ id: "rise", sparkline: [0.3, 0.4] }),
    ];
    const movers = getTopMovers(markets);
    expect(movers.map((m) => m.market.id)).toEqual(["drop", "rise", "small"]);
    expect(movers[0].change).toBe(-20);
  });
});
