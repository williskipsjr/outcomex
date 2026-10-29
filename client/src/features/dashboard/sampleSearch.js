import { simulateRequest } from "../../lib/simulateRequest.js";

// TEMPORARY stand-in for the data layer's searchMarkets({ q, limit, signal })
// (D2 in the contract). It searches a pool of markets that are NOT in the
// dashboard's loaded list, like Polymarket's own search would.
export const REMOTE_POOL = [
  {
    id: "pm-600201",
    question: "Will spot Bitcoin ETFs see net inflows every week of November 2026?",
    category: "Crypto",
    endDate: "2026-11-30T23:59:00Z",
    createdAt: "2026-10-20T00:00:00Z",
    crowdProbability: 0.31,
    volume: 210400,
  },
  {
    id: "pm-600202",
    question: "Will Bitcoin dominance be above 55% on 1 December 2026?",
    category: "Crypto",
    endDate: "2026-12-01T00:00:00Z",
    createdAt: "2026-09-12T00:00:00Z",
    crowdProbability: 0.6,
    volume: 98300,
  },
  {
    id: "pm-600203",
    question: "Will the Fed chair hold a press conference outside a scheduled meeting in 2026?",
    category: "Economy",
    endDate: "2026-12-31T23:59:00Z",
    createdAt: "2026-04-02T00:00:00Z",
    crowdProbability: 0.12,
    volume: 45600,
  },
  {
    id: "pm-600204",
    question: "Will turnout in the 2026 Kerala local body election exceed 70%?",
    category: "Politics",
    endDate: "2026-12-20T12:00:00Z",
    createdAt: "2026-10-01T00:00:00Z",
    crowdProbability: 0.67,
    volume: 33100,
  },
  {
    id: "pm-600205",
    question: "Will a third-party candidate poll above 10% in any 2026 US Senate election?",
    category: "Politics",
    endDate: "2026-11-03T23:59:00Z",
    createdAt: "2026-06-15T00:00:00Z",
    crowdProbability: 0.08,
    volume: 120900,
  },
  {
    id: "pm-600206",
    question: "Will India's November 2026 CPI inflation print below 4%?",
    category: "Economy",
    endDate: "2026-12-12T10:00:00Z",
    createdAt: "2026-10-14T00:00:00Z",
    crowdProbability: 0.54,
    volume: 27800,
  },
  {
    id: "pm-600207",
    question: "Will Real Madrid and Barcelona both reach the Champions League quarter-finals?",
    category: "Sports",
    endDate: "2027-04-15T21:00:00Z",
    createdAt: "2026-09-01T00:00:00Z",
    crowdProbability: 0.44,
    volume: 76200,
  },
].map((market) => ({
  source: "polymarket",
  imageUrl: null,
  status: "open",
  outcome: null,
  sourceUrl: "https://polymarket.com/",
  ...market,
}));

export function searchSampleMarkets({ q, limit = 10, signal }) {
  const query = (q ?? "").trim().toLowerCase();

  // Same input check as the real searchMarkets: 2 to 80 characters
  if (query.length < 2 || query.length > 80) {
    return Promise.reject({
      code: "VALIDATION_ERROR",
      message: "Search needs 2 to 80 characters.",
    });
  }

  const results = REMOTE_POOL.filter((market) =>
    market.question.toLowerCase().includes(query),
  ).slice(0, limit);

  return simulateRequest(results, signal, { delayMs: 500 });
}
