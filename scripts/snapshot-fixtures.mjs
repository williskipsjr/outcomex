// Refreshes the mock-mode fixtures in client/src/mocks from live Polymarket
// data (BE-07), so mocks and reality can't drift apart.
//
//   node scripts/snapshot-fixtures.mjs
//
// It runs the app's own data layer in Node, so every fixture is already in
// the contract shape. The hand-written edge cases live in
// client/src/mocks/edgeCases.js and are not touched. The practice fixtures
// come from the ML pipeline and are not touched either.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCache } from "../client/src/data/cache.js";
import { downsample } from "../client/src/data/normalize.js";
import { createPolymarketApi } from "../client/src/data/polymarket.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "client", "src", "mocks");

const MARKET_COUNT = 60;
const HISTORY_MARKETS = 12; // full price history for the first 12 markets only, to keep the files small
const HISTORY_POINTS = 60;
const PREDICTED_MARKETS = 20;
const SEARCH_QUERIES = ["bitcoin", "fed", "election", "nba", "ai", "ukraine"];

// Some networks drop connections now and then. Retry those a few times
// here, so one reset doesn't spoil a whole snapshot.
async function patientFetch(url, options) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt >= 5 || options?.signal?.aborted) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
}

const api = createPolymarketApi({ fetchImpl: patientFetch, cache: createCache({ storage: null }) });

async function save(name, value) {
  await writeFile(join(OUT, name), JSON.stringify(value, null, 1) + "\n", "utf8");
  console.log(`  wrote ${name}`);
}

const toSeconds = (iso) => Math.round(Date.parse(iso) / 1000);
const round3 = (value) => Math.round(value * 1000) / 1000;

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log("Listing markets…");
  const { data: markets } = await api.listMarkets({ limit: MARKET_COUNT });
  console.log(`  ${markets.length} markets`);

  console.log("Loading details…");
  const details = {};
  for (const market of markets) {
    const { data } = await api.getMarket(market.id);
    details[market.id] = { description: data.description, startDate: data.startDate };
  }

  console.log("Loading sparklines…");
  // getSparklines takes at most 50 ids, like the app will ask for them
  const sparklines = {};
  const ids = markets.map((market) => market.id);
  for (let start = 0; start < ids.length; start += 50) {
    const { data } = await api.getSparklines(ids.slice(start, start + 50));
    Object.assign(sparklines, data);
  }

  console.log("Loading price histories…");
  const history = {};
  for (const market of markets.slice(0, HISTORY_MARKETS)) {
    history[market.id] = {};
    for (const range of ["1d", "1w", "1m", "all"]) {
      const { data } = await api.getHistory(market.id, range);
      // Stored compactly as [unix seconds, price]; mock.js turns it back into { t, p }
      history[market.id][range] = downsample(data.points, HISTORY_POINTS).map((point) => [toSeconds(point.t), point.p]);
    }
  }

  console.log("Searching…");
  const known = new Set(markets.map((market) => market.id));
  const searchPool = [];
  for (const q of SEARCH_QUERIES) {
    const { data } = await api.searchMarkets({ q, limit: 10 });
    for (const market of data) {
      if (known.has(market.id)) continue;
      known.add(market.id);
      searchPool.push(market);
    }
  }

  // A clearly fake predictions file in the contract shape, so the reveal's AI
  // row has something to show in mock mode. It is NOT a model.
  const predictions = {
    modelVersion: "mock-0 (not a real model)",
    level: "model",
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    metrics: { testBrier: null, crowdBrier: null, n: 0 },
    predictions: Object.fromEntries(
      markets
        .filter((market) => market.crowdProbability !== null)
        .slice(0, PREDICTED_MARKETS)
        .map((market, index) => {
          const nudge = ((index % 5) - 2) * 0.03;
          const probability = round3(Math.min(0.99, Math.max(0.01, market.crowdProbability + nudge)));
          return [market.id, { probability, explanation: ["Mock reason: replaced when the ML pipeline runs"] }];
        }),
    ),
  };

  await save("markets.json", markets);
  await save("marketDetails.json", details);
  await save("sparklines.json", sparklines);
  await save("history.json", history);
  await save("searchPool.json", searchPool);
  await save("predictions.json", predictions);
  await save("snapshot.json", {
    takenAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: "Polymarket Gamma + CLOB, through client/src/data",
    counts: {
      markets: markets.length,
      sparklines: Object.keys(sparklines).length,
      histories: Object.keys(history).length,
      searchPool: searchPool.length,
      predictions: Object.keys(predictions.predictions).length,
    },
  });
  console.log("Done.");
}

main().catch((error) => {
  console.error("Snapshot failed:", error.code ?? "", error.message);
  process.exitCode = 1;
});
