import { cacheKey, createCache } from "./cache.js";
import { DataError } from "./errors.js";
import { fetchJson } from "./http.js";
import {
  normalizeHistory,
  normalizeMarketDetail,
  normalizeMarkets,
  normalizeSearch,
  sparklineFrom,
  statusOf,
  yesTokenIdOf,
} from "./normalize.js";
import { checkLimit, checkMarketId, checkMarketIds, checkQuery, checkRange } from "./validate.js";

// The Polymarket services: D1 listMarkets, D2 searchMarkets, D3 getMarket,
// D4 getHistory, D9 getStatuses and D11 getSparklines. Every one checks its
// input, goes through the cache, and returns { data, meta } or a DataError.

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const TTL = { markets: 60 * SECOND, search: 30 * SECOND, market: 60 * SECOND, history: 5 * MINUTE, statuses: 60 * SECOND };

// Our range -> CLOB interval and fidelity (minutes between points)
const HISTORY_PARAMS = {
  "1d": { interval: "1d", fidelity: 5 },
  "1w": { interval: "1w", fidelity: 60 },
  "1m": { interval: "1m", fidelity: 180 },
  all: { interval: "max", fidelity: 1440 },
};

// One big event (e.g. "2028 Democratic nominee") has 100+ yes/no markets, one
// per candidate. Without a cap they would fill the whole dashboard.
export const MAX_PER_EVENT = 3;

const SPARKLINE_CONCURRENCY = 4;
const source = "polymarket";

const numericId = (id) => id.slice(3); // "pm-665374" -> "665374"

function expectArray(value, what) {
  if (!Array.isArray(value)) {
    console.error(`[data] ${what}: expected an array, got`, value);
    throw new DataError("INVALID_DATA", "We got data we couldn't read.");
  }
  return value;
}

// Runs `work` over items with at most `limit` running at once
async function mapWithLimit(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function createPolymarketApi({ fetchImpl = (...args) => globalThis.fetch(...args), cache = createCache() } = {}) {
  const get = (url, signal) => fetchJson(url, { signal, fetchImpl });

  // Market id -> YES token id. Learned whenever we read a market, so the
  // price history usually needs no extra request to find its token.
  const yesTokens = new Map();
  const learnTokens = (rawList) => {
    for (const raw of rawList) {
      const token = yesTokenIdOf(raw);
      if (token) yesTokens.set(`pm-${raw.id}`, token);
    }
  };

  // D1
  async function listMarkets({ limit, signal } = {}) {
    const count = checkLimit(limit, { max: 200, fallback: 100 });
    return cache.get(
      cacheKey("listMarkets", count),
      TTL.markets,
      async (sharedSignal) => {
        // The busiest markets of the last 24 h, not of all time: all-time
        // volume is dominated by long-running, near-certain election markets.
        // We ask for 500 rows because the per-event cap and the yes/no filter
        // drop many of them.
        const params = new URLSearchParams({
          active: "true",
          closed: "false",
          archived: "false",
          order: "volume24hr",
          ascending: "false",
          include_tag: "true",
          limit: "500",
        });
        const rawList = expectArray(await get(`${GAMMA}/markets?${params}`, sharedSignal), "listMarkets");
        learnTokens(rawList);

        const perEvent = new Map();
        const markets = [];
        for (const raw of rawList) {
          const event = raw.events?.[0]?.slug ?? raw.id;
          if ((perEvent.get(event) ?? 0) >= MAX_PER_EVENT) continue;
          const [market] = normalizeMarkets([raw]);
          if (!market || market.status !== "open") continue;
          perEvent.set(event, (perEvent.get(event) ?? 0) + 1);
          markets.push(market);
          if (markets.length === count) break;
        }
        return markets;
      },
      { signal, source },
    );
  }

  // D2
  async function searchMarkets({ q, limit, signal } = {}) {
    const query = checkQuery(q);
    const count = checkLimit(limit, { max: 50, fallback: 20 });
    return cache.get(
      cacheKey("searchMarkets", query.toLowerCase(), count),
      TTL.search,
      async (sharedSignal) => {
        const params = new URLSearchParams({ q: query, limit_per_type: "10", events_status: "active" });
        const response = await get(`${GAMMA}/public-search?${params}`, sharedSignal);
        if (!response || typeof response !== "object") {
          throw new DataError("INVALID_DATA", "We got data we couldn't read.");
        }
        for (const event of response.events ?? []) learnTokens(event.markets ?? []);
        return normalizeSearch(response).slice(0, count);
      },
      { signal, source },
    );
  }

  // Shared by getMarket and getHistory (which needs the token id)
  function loadMarket(id, signal) {
    return cache.get(
      cacheKey("getMarket", id),
      TTL.market,
      async (sharedSignal) => {
        const raw = await get(`${GAMMA}/markets/${numericId(id)}?include_tag=true`, sharedSignal);
        const detail = normalizeMarketDetail(raw);
        // A market with more than two outcomes isn't one OutcomeX can show
        if (!detail) throw new DataError("NOT_FOUND", "We couldn't find that market.");
        learnTokens([raw]);
        return detail;
      },
      { signal, source },
    );
  }

  // D3
  async function getMarket(id, { signal } = {}) {
    return loadMarket(checkMarketId(id), signal);
  }

  async function yesTokenFor(id, signal) {
    if (!yesTokens.has(id)) await loadMarket(id, signal);
    const token = yesTokens.get(id);
    if (!token) throw new DataError("NOT_FOUND", "This market has no price history.");
    return token;
  }

  function loadHistory(id, range, signal) {
    return cache.get(
      cacheKey("getHistory", id, range),
      TTL.history,
      async (sharedSignal) => {
        const token = await yesTokenFor(id, sharedSignal);
        const { interval, fidelity } = HISTORY_PARAMS[range];
        const params = new URLSearchParams({ market: token, interval, fidelity: String(fidelity) });
        const response = await get(`${CLOB}/prices-history?${params}`, sharedSignal);
        if (!Array.isArray(response?.history)) {
          throw new DataError("INVALID_DATA", "We got price data we couldn't read.");
        }
        return { range, points: normalizeHistory(response) };
      },
      { signal, source },
    );
  }

  // D4
  async function getHistory(id, range, { signal } = {}) {
    return loadHistory(checkMarketId(id), checkRange(range), signal);
  }

  // D9 (P1). /markets?id=… returns only open markets unless closed=true is
  // sent, and then only closed ones, so we ask both ways and merge.
  async function getStatuses(ids, { signal } = {}) {
    const unique = checkMarketIds(ids);
    return cache.get(
      cacheKey("getStatuses", [...unique].sort()),
      TTL.statuses,
      async (sharedSignal) => {
        const params = unique.map((id) => `id=${numericId(id)}`).join("&");
        const [open, closed] = await Promise.all([
          get(`${GAMMA}/markets?${params}&closed=false&limit=50`, sharedSignal),
          get(`${GAMMA}/markets?${params}&closed=true&limit=50`, sharedSignal),
        ]);
        const byId = new Map();
        for (const raw of [...expectArray(open, "getStatuses"), ...expectArray(closed, "getStatuses")]) {
          byId.set(`pm-${raw.id}`, { id: `pm-${raw.id}`, ...statusOf(raw) });
        }
        return unique.filter((id) => byId.has(id)).map((id) => byId.get(id));
      },
      { signal, source },
    );
  }

  // D11. One week of history per market, at most 4 requests at a time. A
  // market whose history fails is simply left out: the card shows no chart.
  async function getSparklines(ids, { signal } = {}) {
    const unique = checkMarketIds(ids);
    let stale = false;
    const lines = await mapWithLimit(unique, SPARKLINE_CONCURRENCY, async (id) => {
      try {
        const { data, meta } = await loadHistory(id, "1w", signal);
        stale ||= meta.stale;
        return [id, sparklineFrom(data.points)];
      } catch (error) {
        if (error?.code === "ABORTED") throw error;
        return null;
      }
    });
    const data = Object.fromEntries(lines.filter(Boolean));
    return { data, meta: { fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), stale, cache: "miss", source } };
  }

  return { listMarkets, searchMarkets, getMarket, getHistory, getStatuses, getSparklines };
}

// The instance the app uses
export const { listMarkets, searchMarkets, getMarket, getHistory, getStatuses, getSparklines } = createPolymarketApi();
