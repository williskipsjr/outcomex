import { describe, expect, it } from "vitest";
import { applyView } from "./filters.js";
import { DEFAULT_VIEW } from "./viewParams.js";

const NOW = new Date("2026-10-28T00:00:00Z").getTime();

function market(overrides) {
  return {
    id: "pm-1",
    question: "Question?",
    category: "Other",
    status: "open",
    endDate: "2026-12-31T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    crowdProbability: 0.5,
    volume: 100,
    ...overrides,
  };
}

const view = (overrides) => ({ ...DEFAULT_VIEW, ...overrides });
const ids = (markets) => markets.map((m) => m.id);

describe("applyView", () => {
  it("hides closed and resolved markets by default", () => {
    const markets = [
      market({ id: "a" }),
      market({ id: "b", status: "closed" }),
      market({ id: "c", status: "resolved" }),
    ];
    expect(ids(applyView(markets, view(), NOW))).toEqual(["a"]);
    expect(ids(applyView(markets, view({ status: "all" }), NOW))).toHaveLength(3);
  });

  it("'closing' keeps only open markets ending within 7 days", () => {
    const markets = [
      market({ id: "soon", endDate: "2026-11-02T00:00:00Z" }),
      market({ id: "later", endDate: "2026-11-30T00:00:00Z" }),
      market({ id: "past", endDate: "2026-10-01T00:00:00Z" }),
    ];
    expect(ids(applyView(markets, view({ status: "closing" }), NOW))).toEqual(["soon"]);
  });

  it("filters by any of the chosen categories", () => {
    const markets = [
      market({ id: "a", category: "Crypto" }),
      market({ id: "b", category: "Sports" }),
      market({ id: "c", category: "World" }),
    ];
    const result = applyView(markets, view({ cat: ["Crypto", "World"] }), NOW);
    expect(ids(result).sort()).toEqual(["a", "c"]);
  });

  it("searches the question, ignoring case", () => {
    const markets = [
      market({ id: "a", question: "Will Bitcoin hit $150k?" }),
      market({ id: "b", question: "Will the Fed cut rates?" }),
    ];
    expect(ids(applyView(markets, view({ q: "bitcoin" }), NOW))).toEqual(["a"]);
  });

  it("sorts by volume, newest and ending date", () => {
    const markets = [
      market({ id: "a", volume: 10, createdAt: "2026-03-01T00:00:00Z", endDate: "2026-12-01T00:00:00Z" }),
      market({ id: "b", volume: 30, createdAt: "2026-01-01T00:00:00Z", endDate: "2026-11-01T00:00:00Z" }),
      market({ id: "c", volume: 20, createdAt: "2026-02-01T00:00:00Z", endDate: "2026-11-15T00:00:00Z" }),
    ];
    expect(ids(applyView(markets, view({ sort: "volume" }), NOW))).toEqual(["b", "c", "a"]);
    expect(ids(applyView(markets, view({ sort: "newest" }), NOW))).toEqual(["a", "c", "b"]);
    expect(ids(applyView(markets, view({ sort: "ending" }), NOW))).toEqual(["b", "c", "a"]);
  });

  it("puts markets without a price last in both probability sorts", () => {
    const markets = [
      market({ id: "none", crowdProbability: null }),
      market({ id: "low", crowdProbability: 0.2 }),
      market({ id: "high", crowdProbability: 0.8 }),
    ];
    expect(ids(applyView(markets, view({ sort: "prob-high" }), NOW))).toEqual(["high", "low", "none"]);
    expect(ids(applyView(markets, view({ sort: "prob-low" }), NOW))).toEqual(["low", "high", "none"]);
  });

  it("breaks ties by id so the order is stable", () => {
    const markets = [market({ id: "pm-3" }), market({ id: "pm-1" }), market({ id: "pm-2" })];
    expect(ids(applyView(markets, view({ sort: "volume" }), NOW))).toEqual(["pm-1", "pm-2", "pm-3"]);
  });

  it("does not change the array it was given", () => {
    const markets = [market({ id: "b", volume: 1 }), market({ id: "a", volume: 2 })];
    applyView(markets, view({ sort: "volume" }), NOW);
    expect(ids(markets)).toEqual(["b", "a"]);
  });
});
