// Hand-written markets the real snapshot doesn't contain, so every unusual
// case has a fixture (BE role guide §5.2). The snapshot script never touches
// this file.

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (time) => new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");

// Dates relative to "now", so "closes in 3 days" stays true whenever the mocks run
export function edgeCaseMarkets(now = Date.now()) {
  const base = {
    source: "polymarket",
    status: "open",
    outcome: null,
    createdAt: iso(now - 30 * DAY_MS),
    sourceUrl: "https://polymarket.com/",
    weekChange: null,
    sparkline: null,
  };
  return [
    {
      ...base,
      id: "pm-900001",
      question: "Will a new market about the weather in Dharwad get any trades?",
      category: "Other",
      imageUrl: null,
      endDate: iso(now + 20 * DAY_MS),
      crowdProbability: null,
      volume: 0,
    },
    {
      ...base,
      id: "pm-900002",
      question:
        "Will the combined average of the three most-cited national opinion polls, as published on the final weekday before the deadline, show the incumbent coalition ahead by more than five percentage points among likely voters?",
      category: "Politics",
      imageUrl: null,
      endDate: iso(now + 3 * DAY_MS),
      crowdProbability: 0.42,
      volume: 1520,
    },
    {
      ...base,
      id: "pm-900003",
      question: "東京の11月の平均気温は15度を超えるか？ (Will Tokyo's November average be above 15°C?)",
      category: "World",
      imageUrl: null,
      endDate: iso(now + 6 * DAY_MS),
      crowdProbability: 0.58,
      volume: 8800,
    },
    {
      ...base,
      id: "pm-900004",
      question: "Will this already-resolved sample market show as resolved?",
      category: "Other",
      imageUrl: null,
      endDate: iso(now - 2 * DAY_MS),
      status: "resolved",
      outcome: "YES",
      crowdProbability: 1,
      volume: 4200,
    },
  ];
}

export const EDGE_CASE_DETAILS = {
  "pm-900001": { description: "", startDate: null },
  "pm-900002": { description: "A hand-written fixture with a very long question, to test wrapping and clamping.", startDate: null },
  "pm-900003": { description: "A hand-written fixture with non-ASCII text.", startDate: null },
  "pm-900004": { description: "A hand-written fixture for a market that has already resolved YES.", startDate: null },
};

// pm-900002 has a single point: the chart's "not enough data" state
export function edgeCaseHistory(now = Date.now()) {
  const one = [[Math.round(now / 1000) - 3600, 0.42]];
  return { "pm-900002": { "1d": one, "1w": one, "1m": one, all: one } };
}
