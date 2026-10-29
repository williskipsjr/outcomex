import { describe, expect, it } from "vitest";
import categoryCases from "./__fixtures__/category-cases.json";
import raw from "./__fixtures__/gamma-raw.json";
import {
  categoryOf,
  downsample,
  normalizeHistory,
  normalizeMarket,
  normalizeMarketDetail,
  normalizeSearch,
  parseJsonList,
  sparklineFrom,
  statusOf,
  toIso,
  yesTokenIdOf,
} from "./normalize.js";

const tags = (...labels) => labels.map((label) => ({ label, slug: label.toLowerCase().replace(/ /g, "-") }));

describe("parseJsonList", () => {
  it("reads Gamma's JSON-in-a-string fields", () => {
    expect(parseJsonList('["Yes", "No"]')).toEqual(["Yes", "No"]);
    expect(parseJsonList(["Yes", "No"])).toEqual(["Yes", "No"]);
    expect(parseJsonList("[broken")).toBe(null);
    expect(parseJsonList('{"a":1}')).toBe(null);
    expect(parseJsonList(undefined)).toBe(null);
  });
});

describe("toIso", () => {
  it("handles every date format Gamma sends", () => {
    expect(toIso("2025-11-04T19:52:57.799278Z")).toBe("2025-11-04T19:52:57Z");
    expect(toIso("2026-10-29 19:47:10.221006+00")).toBe("2026-10-29T19:47:10Z");
    expect(toIso("2027-01-01T04:59:00Z")).toBe("2027-01-01T04:59:00Z");
    expect(toIso("not a date")).toBe(null);
    expect(toIso(null)).toBe(null);
  });
});

describe("normalizeMarket on real Gamma markets", () => {
  const [iran] = raw.openMarkets;

  it("produces the contract's Market shape", () => {
    expect(normalizeMarket(iran)).toEqual({
      id: "pm-665374",
      source: "polymarket",
      question: "Will the U.S. invade Iran before 2027?",
      category: "Politics",
      imageUrl: iran.image,
      endDate: "2027-01-01T04:59:00Z",
      createdAt: "2025-11-04T19:52:57Z",
      status: "open",
      outcome: null,
      crowdProbability: 0.195,
      volume: iran.volumeNum,
      sourceUrl: "https://polymarket.com/event/will-the-us-invade-iran-before-2027",
      weekChange: iran.oneWeekPriceChange,
      sparkline: null,
    });
  });

  it("finds the YES token id", () => {
    expect(yesTokenIdOf(iran)).toBe(JSON.parse(iran.clobTokenIds)[0]);
  });

  it("maps a closed market with a 0/1 price to resolved", () => {
    const market = normalizeMarket(raw.closedMarket);
    expect(market).toMatchObject({ status: "resolved", outcome: "NO", crowdProbability: 0 });
  });

  it("adds description and startDate for the detail", () => {
    const detail = normalizeMarketDetail(iran);
    expect(detail.description).toMatch(/^This market will resolve/);
    expect(detail.startDate).toBe("2025-11-05T17:52:17Z");
  });

  it("skips markets it can't read instead of breaking", () => {
    expect(normalizeMarket({ ...iran, outcomes: '["Up", "Down"]' })).toBe(null);
    expect(normalizeMarket({ ...iran, outcomes: '["Yes", "No", "Maybe"]' })).toBe(null);
    expect(normalizeMarket({ ...iran, outcomes: "[broken" })).toBe(null);
    expect(normalizeMarket({ ...iran, question: "  " })).toBe(null);
    expect(normalizeMarket(null)).toBe(null);
  });

  it("copes with missing prices, images and volume", () => {
    const market = normalizeMarket({ ...iran, outcomePrices: undefined, image: "", icon: null, volumeNum: undefined, volume: undefined });
    expect(market).toMatchObject({ crowdProbability: null, imageUrl: null, volume: 0 });
  });

  it("reads the YES price even when the outcomes are in the other order", () => {
    const flipped = { ...iran, outcomes: '["No", "Yes"]', outcomePrices: '["0.7", "0.3"]' };
    expect(normalizeMarket(flipped).crowdProbability).toBe(0.3);
  });
});

describe("statusOf", () => {
  const prices = (yes) => ({ outcomes: '["Yes","No"]', outcomePrices: JSON.stringify([String(yes), String(1 - yes)]) });
  it("follows the contract's rule", () => {
    expect(statusOf({ ...prices(0.5), closed: false })).toEqual({ status: "open", outcome: null });
    expect(statusOf({ ...prices(0.995), closed: true })).toEqual({ status: "resolved", outcome: "YES" });
    expect(statusOf({ ...prices(0.004), closed: true })).toEqual({ status: "resolved", outcome: "NO" });
    expect(statusOf({ ...prices(0.5), closed: true })).toEqual({ status: "closed", outcome: null });
  });
});

describe("categoryOf", () => {
  it("maps real tag sets", () => {
    expect(categoryOf(raw.openMarkets[0].tags)).toBe("Politics"); // US invades Iran: Geopolitics + Trump
    expect(categoryOf(raw.openMarkets[1].tags)).toBe("Culture");
    expect(categoryOf(raw.openMarkets[2].tags)).toBe("Politics"); // "World Elections" isn't World
    expect(categoryOf(tags("Geopolitics", "World", "Middle East", "Israel", "Politics"))).toBe("World");
    expect(categoryOf(tags("Bitcoin", "Crypto Prices", "Crypto"))).toBe("Crypto");
    expect(categoryOf(tags("Fed Rates", "Economy", "Politics"))).toBe("Economy");
    expect(categoryOf(tags("Aliens", "Politics", "Culture", "Science"))).toBe("Tech & Science");
    expect(categoryOf(tags("Soccer", "UCL"))).toBe("Sports");
  });

  it("matches the cases shared with the ML pipeline", () => {
    for (const { tags: labels, question, expected } of categoryCases.cases) {
      expect(categoryOf(tags(...labels), question), question).toBe(expected);
    }
  });

  it("falls back to keywords, then Other", () => {
    expect(categoryOf([], "Will Bitcoin reach $150,000 in October?")).toBe("Crypto");
    expect(categoryOf(undefined, "Will the Fed cut interest rates in December?")).toBe("Economy");
    expect(categoryOf([], "Will it snow in Dharwad?")).toBe("Other");
  });
});

describe("normalizeSearch", () => {
  it("flattens events and uses the event's tags and slug", () => {
    const markets = normalizeSearch(raw.search);
    expect(markets.length).toBe(2);
    expect(markets[0]).toMatchObject({ category: "Crypto", status: "open" });
    expect(markets[0].sourceUrl).toBe(`https://polymarket.com/event/${raw.search.events[0].slug}`);
  });

  it("drops closed markets and duplicates", () => {
    const [first] = raw.search.events[0].markets;
    const response = { events: [{ markets: [first, first, { ...first, id: "1", closed: true }] }] };
    expect(normalizeSearch(response).length).toBe(1);
    expect(normalizeSearch({})).toEqual([]);
  });
});

describe("price history", () => {
  it("converts CLOB points to ISO times, oldest first", () => {
    const points = normalizeHistory(raw.history);
    expect(points.length).toBe(raw.history.history.length);
    expect(points[0].t).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(points[0].t < points[points.length - 1].t).toBe(true);
  });

  it("drops broken points and never returns more than the maximum", () => {
    const history = Array.from({ length: 1000 }, (_, i) => ({ t: 1_700_000_000 + i * 60, p: 0.5 }));
    history.push({ t: "x", p: 0.5 }, { t: 1, p: 7 });
    const points = normalizeHistory({ history }, 200);
    expect(points.length).toBe(200);
    expect(points[0].t).toBe(new Date(1_700_000_000_000).toISOString().replace(".000", ""));
  });

  it("downsamples evenly and keeps the first and last items", () => {
    const items = Array.from({ length: 101 }, (_, i) => i);
    expect(downsample(items, 5)).toEqual([0, 25, 50, 75, 100]);
    expect(downsample([1, 2], 16)).toEqual([1, 2]);
  });

  it("makes a 16-point sparkline", () => {
    const points = normalizeHistory(raw.history);
    const line = sparklineFrom(points);
    expect(line.length).toBe(16);
    expect(line[15]).toBe(points[points.length - 1].p);
  });
});
