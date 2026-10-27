import { simulateRequest } from "../../lib/simulateRequest.js";

// TEMPORARY sample data so the dashboard can be built before the data layer
// exists. Every market follows the Market shape in the data contract (master
// plan A.2). Replace loadSampleMarkets with listMarkets once it lands.

const SAMPLE_MARKETS = [
  {
    id: "pm-500101",
    question: "Will the Fed cut interest rates at the December 2026 meeting?",
    category: "Economy",
    endDate: "2026-12-16T19:00:00Z",
    createdAt: "2026-09-18T10:00:00Z",
    crowdProbability: 0.64,
    volume: 1823400.5,
  },
  {
    id: "pm-500102",
    question: "Will Bitcoin close above $150,000 on 31 December 2026?",
    category: "Crypto",
    endDate: "2026-12-31T23:59:00Z",
    createdAt: "2026-07-01T08:00:00Z",
    crowdProbability: 0.22,
    volume: 5402100,
  },
  {
    id: "pm-500103",
    question: "Will India win the 2026 Border–Gavaskar Trophy series opener?",
    category: "Sports",
    endDate: "2026-11-03T12:00:00Z",
    createdAt: "2026-10-01T06:00:00Z",
    crowdProbability: 0.48,
    volume: 312050,
  },
  {
    id: "pm-500104",
    question: "Will OpenAI release a new flagship model before 1 December 2026?",
    category: "Tech & Science",
    endDate: "2026-11-30T23:59:00Z",
    createdAt: "2026-08-12T15:30:00Z",
    crowdProbability: 0.71,
    volume: 960000,
  },
  {
    id: "pm-500105",
    question: "Will a ceasefire agreement be signed in the Sudan conflict by the end of 2026?",
    category: "World",
    endDate: "2026-12-31T23:59:00Z",
    createdAt: "2026-06-20T09:00:00Z",
    crowdProbability: 0.09,
    volume: 145300,
  },
  {
    id: "pm-500106",
    question: "Will the next James Bond actor be officially announced before 2027?",
    category: "Culture",
    endDate: "2026-12-31T23:59:00Z",
    createdAt: "2026-05-04T12:00:00Z",
    crowdProbability: 0.37,
    volume: 88200,
  },
  {
    id: "pm-500107",
    question: "Will the US House pass a federal stablecoin bill in November 2026?",
    category: "Politics",
    endDate: "2026-11-30T23:59:00Z",
    createdAt: "2026-10-10T14:00:00Z",
    crowdProbability: 0.55,
    volume: 402700,
  },
  {
    id: "pm-500108",
    question: "Will Ethereum flip Bitcoin in market cap at any point in 2026?",
    category: "Crypto",
    endDate: "2026-12-31T23:59:00Z",
    createdAt: "2026-01-02T00:00:00Z",
    crowdProbability: 0.03,
    volume: 2210000,
  },
  {
    id: "pm-500109",
    question: "Will SpaceX's Starship complete a full orbit and a controlled landing of both stages before the end of November 2026, as confirmed by an official SpaceX statement?",
    category: "Tech & Science",
    endDate: "2026-11-30T23:59:00Z",
    createdAt: "2026-09-01T00:00:00Z",
    crowdProbability: 0.18,
    volume: 530900,
  },
  {
    id: "pm-500110",
    question: "Will Real Madrid top La Liga on 1 November 2026?",
    category: "Sports",
    endDate: "2026-11-01T22:00:00Z",
    createdAt: "2026-08-15T10:00:00Z",
    crowdProbability: 0.58,
    volume: 120400,
  },
  {
    id: "pm-500111",
    question: "Will Japan's Nikkei 225 end 2026 above 45,000? (日経平均)",
    category: "Economy",
    endDate: "2026-12-30T06:00:00Z",
    createdAt: "2026-03-03T03:00:00Z",
    crowdProbability: 0.41,
    volume: 76500,
  },
  {
    id: "pm-500112",
    question: "Will a new Polymarket market about the weather in Dharwad get any trades?",
    category: "Other",
    endDate: "2026-11-15T12:00:00Z",
    createdAt: "2026-10-25T12:00:00Z",
    crowdProbability: null,
    volume: 0,
  },
].map((market) => ({
  source: "polymarket",
  imageUrl: null,
  status: "open",
  outcome: null,
  sourceUrl: "https://polymarket.com/",
  ...market,
}));

// Replace with listMarkets({ limit: 100, signal }) once the data layer lands
export function loadSampleMarkets(signal) {
  return simulateRequest(SAMPLE_MARKETS, signal);
}
