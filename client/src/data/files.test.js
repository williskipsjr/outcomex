import { describe, expect, it, vi } from "vitest";
import { createCache } from "./cache.js";
import { createFilesApi } from "./files.js";

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const missing = () => ({ ok: false, status: 404, json: async () => ({}) });

const PREDICTIONS = {
  modelVersion: "lr-2026-11-15",
  level: "model",
  generatedAt: "2026-11-19T04:00:00Z",
  metrics: { testBrier: 0.18, crowdBrier: 0.179, n: 120 },
  predictions: {
    "pm-1": { probability: 0.55, explanation: ["Price rose 9 points in 7 days", "a", "b", "too many"] },
    "pm-2": { probability: null, explanation: [] },
  },
};

const PRACTICE_LIST = {
  generatedAt: "2026-11-06T00:00:00Z",
  asOfOffsetDays: 7,
  items: [
    { id: "pr-1", question: "Q1?", description: "Rules", category: "Sports", imageUrl: "", asOfDate: "2026-07-13T00:00:00Z", closedDate: "2026-07-20T00:00:00Z" },
    { id: "pr-2", question: "Q2?", category: "Nonsense", asOfDate: "2026-05-01T00:00:00Z", closedDate: "2026-05-08T00:00:00Z", outcome: "YES" },
    { id: "broken" },
  ],
};

const ANSWERS = {
  generatedAt: "2026-11-06T00:00:00Z",
  answers: {
    "pr-1": { outcome: "NO", crowdProbabilityAsOf: 0.182, aiProbability: 0.21, modelVersion: "lr-1", resolvedAt: "2026-07-20T01:24:43Z" },
    "pr-2": { outcome: "YES", crowdProbabilityAsOf: 0.6, aiProbability: null, modelVersion: null, resolvedAt: "2026-05-08T00:00:00Z" },
    "pr-3": { outcome: "MAYBE", crowdProbabilityAsOf: 0.5 },
  },
};

function setup(files) {
  const requested = [];
  const fetchImpl = vi.fn(async (url) => {
    requested.push(url);
    const name = url.split("/").pop();
    const body = typeof files[name] === "function" ? files[name]() : files[name];
    return body === undefined ? missing() : ok(body);
  });
  const api = createFilesApi({ fetchImpl, cache: createCache({ storage: null }) });
  return { api, requested };
}

describe("getPrediction", () => {
  it("returns the model's probability with up to 3 reasons", async () => {
    const { api } = setup({ "predictions.json": PREDICTIONS });
    const { data } = await api.getPrediction("pm-1");
    expect(data).toEqual({
      marketId: "pm-1",
      available: true,
      level: "model",
      probability: 0.55,
      modelVersion: "lr-2026-11-15",
      explanation: ["Price rose 9 points in 7 days", "a", "b"],
      generatedAt: "2026-11-19T04:00:00Z",
      reason: null,
    });
  });

  it("says NOT_SCORED for a market that isn't in the file", async () => {
    const { api } = setup({ "predictions.json": PREDICTIONS });
    const { data } = await api.getPrediction("pm-77");
    expect(data).toMatchObject({ available: false, level: "model", reason: "NOT_SCORED" });
  });

  it("shows signals without a probability at level signal", async () => {
    const signal = { ...PREDICTIONS, level: "signal", predictions: { "pm-1": { probability: 0.6, explanation: ["Momentum up"] } } };
    const { api } = setup({ "predictions.json": signal });
    const { data } = await api.getPrediction("pm-1");
    expect(data).toMatchObject({ available: false, level: "signal", probability: null, explanation: ["Momentum up"], reason: null });
  });

  it("never fails for a valid id: a missing or broken file means ML_DISABLED", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const files of [{}, { "predictions.json": { level: "magic" } }]) {
      const { api } = setup(files);
      const { data } = await api.getPrediction("pm-1");
      expect(data).toMatchObject({ available: false, level: "none", reason: "ML_DISABLED" });
    }
    const { api } = setup({});
    await expect(api.getPrediction("nope")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("practice list", () => {
  it("keeps only contract fields, so no answer can leak", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { api } = setup({ "practice-list.json": PRACTICE_LIST });
    const { data } = await api.listPractice();
    expect(data.map((item) => item.id)).toEqual(["pr-1", "pr-2"]);
    expect(data[1]).not.toHaveProperty("outcome");
    expect(data[1].category).toBe("Other");
    expect(data[0].imageUrl).toBe(null);
  });

  it("filters by category and validates its input", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { api } = setup({ "practice-list.json": PRACTICE_LIST });
    expect((await api.listPractice({ category: "Sports" })).data.length).toBe(1);
    await expect(api.listPractice({ category: "sports" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("finds one market or says NOT_FOUND", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { api } = setup({ "practice-list.json": PRACTICE_LIST });
    expect((await api.getPractice("pr-1")).data.question).toBe("Q1?");
    await expect(api.getPractice("pr-9")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("reports a missing list as unavailable", async () => {
    const { api } = setup({});
    await expect(api.listPractice()).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });
});

describe("revealPractice (AT-15)", () => {
  it("rejects a tampered probability before requesting the answers", async () => {
    const { api, requested } = setup({ "practice-answers.json": ANSWERS });
    for (const bad of [1.5, "0.4", 0, NaN]) {
      await expect(api.revealPractice("pr-1", bad)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
    expect(requested).toEqual([]);
  });

  it("returns the outcome, the crowd as-of and the AI", async () => {
    const { api } = setup({ "practice-answers.json": ANSWERS });
    const { data } = await api.revealPractice("pr-1", 0.3);
    expect(data).toEqual({
      id: "pr-1",
      outcome: "NO",
      crowdProbabilityAsOf: 0.182,
      ai: { available: true, probability: 0.21, modelVersion: "lr-1" },
      resolvedAt: "2026-07-20T01:24:43Z",
    });
    expect((await api.revealPractice("pr-2", 0.3)).data.ai).toEqual({ available: false, probability: null, modelVersion: null });
  });

  it("gives clear errors for a missing file, a missing answer and a broken answer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(setup({}).api.revealPractice("pr-1", 0.3)).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    const { api } = setup({ "practice-answers.json": ANSWERS });
    await expect(api.revealPractice("pr-9", 0.3)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(api.revealPractice("pr-3", 0.3)).rejects.toMatchObject({ code: "INVALID_DATA" });
  });
});
