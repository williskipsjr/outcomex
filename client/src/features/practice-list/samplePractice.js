import { simulateRequest } from "../../lib/simulateRequest.js";
import snapshot from "./practiceSnapshot.json";

// TEMPORARY sample practice markets so the page can be built before
// practice-list.json exists. practiceSnapshot.json is a one-off copy of 16
// real resolved Polymarket markets (question, photo, dates), taken on
// 28 Oct 2026. Shape: PracticeMarket (master plan A.4).
//
// There is deliberately no outcome and no crowd price here: the list must
// never give the answer away. Those only arrive after you commit a call.
// asOfDate is 7 days before the market closed: the moment you "travel back" to.
const SAMPLE_PRACTICE = snapshot.map((market) => ({ description: "", ...market }));

// Replace with listPractice({ limit, category }) once the data layer lands
export function loadSamplePractice(signal) {
  return simulateRequest(SAMPLE_PRACTICE, signal);
}
