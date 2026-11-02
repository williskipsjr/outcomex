import { useEffect, useRef, useState } from "react";
import { getStatuses } from "../../data/index.js";
import { pendingLiveMarketIds } from "./callsStorage.js";
import useCalls from "./useCalls.js";

// getStatuses takes at most 50 ids per call
const BATCH_SIZE = 50;

// Live calls wait for their market to resolve. This asks Polymarket about the
// ones still pending and scores any that have finished, so a live call doesn't
// stay "Pending" forever. It runs when My Calls opens.
//
// A failure here is quiet: the calls are still there, just not updated yet, so
// the page only shows a small retry link.
export default function useResolutionCheck() {
  const { calls, resolveCalls } = useCalls();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // resolveCalls is a new function each render; keep the newest in a ref so it
  // doesn't restart the check
  const resolveRef = useRef(resolveCalls);
  useEffect(() => {
    resolveRef.current = resolveCalls;
  });

  // A string, so the check only re-runs when the set of pending markets changes
  const pendingKey = pendingLiveMarketIds(calls).join(",");

  useEffect(() => {
    if (!pendingKey) return undefined;
    const controller = new AbortController();

    async function check() {
      const ids = pendingKey.split(",");
      const updates = [];
      try {
        for (let start = 0; start < ids.length; start += BATCH_SIZE) {
          const batch = ids.slice(start, start + BATCH_SIZE);
          const { data } = await getStatuses(batch, { signal: controller.signal });
          for (const market of data) {
            if (market.status === "resolved") {
              updates.push({ marketId: market.id, outcome: market.outcome, resolvedAt: market.resolvedAt });
            }
          }
        }
        if (controller.signal.aborted) return;
        setFailed(false);
        if (updates.length > 0) resolveRef.current(updates);
      } catch (error) {
        if (error?.code !== "ABORTED") setFailed(true);
      }
    }
    check();

    return () => controller.abort();
  }, [pendingKey, attempt]);

  function retry() {
    setFailed(false);
    setAttempt((value) => value + 1);
  }

  return { failed: failed && pendingKey !== "", retry };
}
