import { simulateRequest } from "../../lib/simulateRequest.js";

// TEMPORARY sample practice markets so the page can be built before
// practice-list.json exists. Shape: PracticeMarket (master plan A.4).
// There is deliberately no outcome and no crowd price here: the list must
// never give the answer away. Those only arrive after you commit a call.
const SAMPLE_PRACTICE = [
  {
    id: "pr-498812",
    question: "Will the Fed cut interest rates at the September 2026 meeting?",
    category: "Economy",
    asOfDate: "2026-09-09T00:00:00Z",
    closedDate: "2026-09-16T18:00:00Z",
  },
  {
    id: "pr-498813",
    question: "Will Bitcoin trade above $120,000 on 30 June 2026?",
    category: "Crypto",
    asOfDate: "2026-06-23T00:00:00Z",
    closedDate: "2026-06-30T23:59:00Z",
  },
  {
    id: "pr-498814",
    question: "Will Spain win the 2026 FIFA World Cup?",
    category: "Sports",
    asOfDate: "2026-07-12T00:00:00Z",
    closedDate: "2026-07-19T22:00:00Z",
  },
  {
    id: "pr-498815",
    question: "Will Apple announce a foldable iPhone at its September 2026 event?",
    category: "Tech & Science",
    asOfDate: "2026-09-02T00:00:00Z",
    closedDate: "2026-09-09T20:00:00Z",
  },
  {
    id: "pr-498816",
    question: "Will the UN General Assembly adopt a new AI governance resolution in 2026's September session?",
    category: "World",
    asOfDate: "2026-09-23T00:00:00Z",
    closedDate: "2026-09-30T23:59:00Z",
  },
  {
    id: "pr-498817",
    question: "Will the top-grossing film of summer 2026 be an animated movie?",
    category: "Culture",
    asOfDate: "2026-08-24T00:00:00Z",
    closedDate: "2026-08-31T23:59:00Z",
  },
  {
    id: "pr-498818",
    question: "Will voter turnout in the 2026 Bihar assembly election exceed 60%?",
    category: "Politics",
    asOfDate: "2026-10-04T00:00:00Z",
    closedDate: "2026-10-11T12:00:00Z",
  },
  {
    id: "pr-498819",
    question: "Will Ethereum close September 2026 higher than it opened?",
    category: "Crypto",
    asOfDate: "2026-09-23T00:00:00Z",
    closedDate: "2026-09-30T23:59:00Z",
  },
].map((market) => ({ imageUrl: null, description: "", ...market }));

// Replace with listPractice({ limit, category }) once the data layer lands
export function loadSamplePractice(signal) {
  return simulateRequest(SAMPLE_PRACTICE, signal);
}
