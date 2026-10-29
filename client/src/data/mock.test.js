import { afterEach, describe, expect, it, vi } from "vitest";
import * as mock from "./mock.js";
import { failureFor } from "./mock.js";

// Fake localStorage for the failure and AI-level switches
const settings = new Map();
vi.stubGlobal("localStorage", {
  getItem: (key) => (settings.has(key) ? settings.get(key) : null),
  setItem: (key, value) => settings.set(key, value),
  removeItem: (key) => settings.delete(key),
});

afterEach(() => settings.clear());

describe("failureFor", () => {
  it("reads every form of the failure switch", () => {
    expect(failureFor("markets", null)).toBe(null);
    expect(failureFor("markets", "RATE_LIMITED")).toBe("RATE_LIMITED");
    expect(failureFor("history", "markets,history")).toBe("UPSTREAM_UNAVAILABLE");
    expect(failureFor("search", "markets,history")).toBe(null);
    expect(failureFor("history", "history:UPSTREAM_TIMEOUT")).toBe("UPSTREAM_TIMEOUT");
    expect(failureFor("history", "history:NONSENSE")).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("mock data layer", () => {
  it("serves open markets in contract shape", async () => {
    const { data, meta } = await mock.listMarkets({ limit: 200 });
    expect(data.length).toBeGreaterThanOrEqual(20);
    expect(data.every((market) => market.status === "open" && /^pm-\d+$/.test(market.id))).toBe(true);
    expect(meta.source).toBe("mock");
  });

  it("answers detail, history and sparklines for the same markets", async () => {
    const { data: markets } = await mock.listMarkets({ limit: 3 });
    const { data: detail } = await mock.getMarket(markets[0].id);
    expect(typeof detail.description).toBe("string");
    const { data: history } = await mock.getHistory(markets[0].id, "1w");
    expect(history.points.length).toBeGreaterThan(1);
    const { data: lines } = await mock.getSparklines(markets.map((market) => market.id));
    expect(Object.keys(lines).length).toBe(3);
  });

  it("keeps the real layer's checks and codes", async () => {
    await expect(mock.getMarket("pm-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(mock.getMarket("x")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(mock.revealPractice("pr-558938", 1.5)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(mock.searchMarkets({ q: "a" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("reveals a practice market", async () => {
    const { data: items } = await mock.listPractice();
    expect(items.length).toBe(16);
    expect(items[0]).not.toHaveProperty("outcome");
    const { data } = await mock.revealPractice(items[0].id, 0.3);
    expect(["YES", "NO"]).toContain(data.outcome);
  });

  it("fails on purpose when the switch is set", async () => {
    settings.set("outcomex.debug.fail", "history");
    const { data: markets } = await mock.listMarkets({ limit: 1 });
    await expect(mock.getHistory(markets[0].id, "1d")).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });

  it("shows all three AI levels", async () => {
    const { data: markets } = await mock.listMarkets({ limit: 1 });
    expect((await mock.getPrediction(markets[0].id)).data.level).toBe("model");
    settings.set("outcomex.debug.aiLevel", "signal");
    expect((await mock.getPrediction(markets[0].id)).data).toMatchObject({ level: "signal", available: false });
    settings.set("outcomex.debug.aiLevel", "none");
    expect((await mock.getPrediction(markets[0].id)).data).toMatchObject({ level: "none", reason: "ML_DISABLED" });
  });

  it("stops quietly when aborted", async () => {
    const controller = new AbortController();
    const pending = mock.listMarkets({ signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "ABORTED" });
  });
});
