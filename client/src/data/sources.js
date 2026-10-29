import { fetchJson } from "./http.js";

// D10 checkSources (P1): one quick request per source, for the small "Data
// status" line on the About page. Never rejects: a failure is a line that
// says what failed. The answers file is deliberately not checked, because
// loading it would put every practice answer in the browser.

const CHECKS = [
  { name: "Polymarket markets (Gamma)", url: "https://gamma-api.polymarket.com/markets?limit=1" },
  { name: "Polymarket prices (CLOB)", url: "https://clob.polymarket.com/time" },
  { name: "AI predictions file", url: "/data/predictions.json" },
  { name: "Practice questions file", url: "/data/practice-list.json" },
];

export async function checkSources({ fetchImpl = (...args) => globalThis.fetch(...args) } = {}) {
  const data = await Promise.all(
    CHECKS.map(async ({ name, url }) => {
      const started = Date.now();
      try {
        await fetchJson(url, { fetchImpl, retries: 0, timeoutMs: 5000, what: name });
        return { name, ok: true, detail: `Answered in ${Date.now() - started} ms` };
      } catch (error) {
        return { name, ok: false, detail: error.message };
      }
    }),
  );
  return {
    data,
    meta: { fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), stale: false, cache: "miss", source: "checks" },
  };
}
