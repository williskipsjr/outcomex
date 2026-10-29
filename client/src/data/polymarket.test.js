import { describe, expect, it, vi } from "vitest";
import raw from "./__fixtures__/gamma-raw.json";
import { createCache } from "./cache.js";
import { createPolymarketApi } from "./polymarket.js";

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const status = (code) => ({ ok: false, status: code, json: async () => ({}) });

// A fake Polymarket: routes each URL to a handler and records every request
function fakePolymarket(routes) {
  const calls = [];
  const fetchImpl = vi.fn(async (url) => {
    calls.push(url);
    for (const [pattern, handler] of routes) {
      if (url.includes(pattern)) return handler(url);
    }
    return status(404);
  });
  const api = createPolymarketApi({ fetchImpl, cache: createCache({ storage: null }) });
  return { api, calls };
}

const [iran, jesus] = raw.openMarkets;
const multiOutcome = { ...jesus, id: "999", outcomes: '["A", "B", "C"]' };

describe("listMarkets", () => {
  it("returns open yes/no markets in contract shape, with meta", async () => {
    const { api, calls } = fakePolymarket([["/markets?", () => ok([iran, multiOutcome, jesus])]]);
    const { data, meta } = await api.listMarkets({ limit: 10 });
    expect(data.map((m) => m.id)).toEqual(["pm-665374", "pm-703258"]);
    expect(meta).toMatchObject({ cache: "miss", stale: false, source: "polymarket" });
    expect(calls[0]).toContain("include_tag=true");
    expect(calls[0]).toContain("closed=false");
  });

  it("keeps at most 3 markets per event", async () => {
    const ladder = Array.from({ length: 6 }, (_, i) => ({ ...iran, id: String(100 + i), events: [{ slug: "nominee-2028" }] }));
    const { api, calls } = fakePolymarket([["/markets?", () => ok([...ladder, jesus])]]);
    const { data } = await api.listMarkets();
    expect(data.map((m) => m.id)).toEqual(["pm-100", "pm-101", "pm-102", "pm-703258"]);
    expect(calls[0]).toContain("order=volume24hr");
  });

  it("answers the second call from the cache", async () => {
    const { api, calls } = fakePolymarket([["/markets?", () => ok([iran])]]);
    await api.listMarkets();
    const second = await api.listMarkets();
    expect(second.meta.cache).toBe("hit");
    expect(calls.length).toBe(1);
  });

  it("rejects a response that isn't a list", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { api } = fakePolymarket([["/markets?", () => ok({ error: "nope" })]]);
    await expect(api.listMarkets()).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("validates before it fetches", async () => {
    const { api, calls } = fakePolymarket([]);
    await expect(api.listMarkets({ limit: 999 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls.length).toBe(0);
  });
});

describe("getMarket", () => {
  it("returns the detail", async () => {
    const { api } = fakePolymarket([["/markets/665374", () => ok(iran)]]);
    const { data } = await api.getMarket("pm-665374");
    expect(data).toMatchObject({ id: "pm-665374", description: expect.stringMatching(/^This market/) });
  });

  it("turns 404, 422 and multi-outcome markets into NOT_FOUND (AT-07)", async () => {
    const { api } = fakePolymarket([
      ["/markets/1?", () => status(404)],
      ["/markets/2?", () => status(422)],
      ["/markets/999?", () => ok(multiOutcome)],
    ]);
    for (const id of ["pm-1", "pm-2", "pm-999"]) {
      await expect(api.getMarket(id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await expect(api.getMarket("does-not-exist")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("getHistory", () => {
  it("looks up the YES token through the market, then asks CLOB", async () => {
    const { api, calls } = fakePolymarket([
      ["/markets/665374", () => ok(iran)],
      ["/prices-history", () => ok(raw.history)],
    ]);
    const { data } = await api.getHistory("pm-665374", "1w");
    expect(data.range).toBe("1w");
    expect(data.points.length).toBe(raw.history.history.length);
    const historyUrl = calls.find((url) => url.includes("prices-history"));
    expect(historyUrl).toContain(`market=${JSON.parse(iran.clobTokenIds)[0]}`);
    expect(historyUrl).toContain("interval=1w");
  });

  it("reuses the token learned from listMarkets", async () => {
    const { api, calls } = fakePolymarket([
      ["/markets?", () => ok([iran])],
      ["/prices-history", (url) => ok({ history: url.includes("interval=max") ? [] : raw.history.history })],
    ]);
    await api.listMarkets();
    await api.getHistory("pm-665374", "all");
    expect(calls.some((url) => url.includes("/markets/665374"))).toBe(false);
    await expect(api.getHistory("pm-665374", "5y")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("searchMarkets", () => {
  it("validates the query and normalises the events", async () => {
    const { api, calls } = fakePolymarket([["/public-search", () => ok(raw.search)]]);
    await expect(api.searchMarkets({ q: "b" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls.length).toBe(0);
    const { data } = await api.searchMarkets({ q: " bitcoin " });
    expect(data.length).toBe(2);
    expect(calls[0]).toContain("q=bitcoin");
  });
});

describe("getStatuses", () => {
  it("asks for open and closed markets and merges them", async () => {
    const { api, calls } = fakePolymarket([
      ["closed=false", () => ok([iran])],
      ["closed=true", () => ok([raw.closedMarket])],
    ]);
    const closedId = `pm-${raw.closedMarket.id}`;
    const { data } = await api.getStatuses(["pm-665374", closedId, "pm-123"]);
    expect(data).toEqual([
      { id: "pm-665374", status: "open", outcome: null },
      { id: closedId, status: "resolved", outcome: "NO" },
    ]);
    expect(calls.length).toBe(2);
  });
});

describe("getSparklines", () => {
  it("returns 16 points per market and leaves out failures", async () => {
    const { api } = fakePolymarket([
      ["/markets/665374", () => ok(iran)],
      ["/markets/703258", () => status(500)],
      ["/prices-history", () => ok(raw.history)],
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { data } = await api.getSparklines(["pm-665374", "pm-703258"]);
    expect(Object.keys(data)).toEqual(["pm-665374"]);
    expect(data["pm-665374"].length).toBe(16);
  });
});
