import { simulateRequest } from "../../lib/simulateRequest.js";
import snapshot from "./marketSnapshot.json";

// TEMPORARY sample data so the dashboard can be built before the data layer
// exists. marketSnapshot.json is a one-off copy of 28 real open Polymarket
// markets (questions, photos, prices and a week of price history), taken
// on 28 Oct 2026 from the public Gamma and CLOB APIs.
//
// Every market follows the Market shape in the data contract (master plan
// A.2). `sparkline` (up to 16 recent YES prices, oldest first) is an extra
// field the cards use; it is proposed as an addition to the contract.

// One hand-written edge case the real snapshot doesn't have: no price yet
const EDGE_CASES = [
  {
    id: "pm-edge-1",
    question: "Will a new market about the weather in Dharwad get any trades?",
    category: "Other",
    imageUrl: null,
    endDate: "2026-11-15T12:00:00Z",
    createdAt: "2026-10-25T12:00:00Z",
    crowdProbability: null,
    volume: 0,
    sourceUrl: "https://polymarket.com/",
    sparkline: [],
  },
];

export const SAMPLE_MARKETS = [...snapshot, ...EDGE_CASES].map((market) => ({
  source: "polymarket",
  status: "open",
  outcome: null,
  ...market,
}));

// Replace with listMarkets({ limit: 100, signal }) once the data layer lands
export function loadSampleMarkets(signal) {
  return simulateRequest(SAMPLE_MARKETS, signal);
}
