import { useEffect, useState } from "react";
import { getSparklines } from "../data/index.js";

// Small batches, so charts appear a few at a time instead of all after a long wait
const BATCH_SIZE = 12;

// Mini charts for the given market ids, loaded in the background a batch at a
// time. Each chart costs one price-history request, so the caller only asks
// for markets whose crowd number is actually on screen.
//
// Charts are decoration: the number is always shown as text, so a failure is
// quiet and the card simply has no chart.
export default function useSparklines(ids) {
  const [lines, setLines] = useState({});
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();

    async function load() {
      const wanted = key.split(",");
      for (let start = 0; start < wanted.length; start += BATCH_SIZE) {
        const batch = wanted.slice(start, start + BATCH_SIZE);
        try {
          const { data } = await getSparklines(batch, { signal: controller.signal });
          if (controller.signal.aborted) return;
          setLines((current) => ({ ...current, ...data }));
        } catch {
          return;
        }
      }
    }
    load();

    // A different list (filters changed, a new call made) replaces this load
    return () => controller.abort();
  }, [key]);

  return lines;
}
