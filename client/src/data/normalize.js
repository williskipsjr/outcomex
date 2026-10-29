// Turns raw Polymarket responses into the shapes in docs/contracts/data.md.
// Pure functions with no browser APIs, so the fixture snapshot script can
// reuse them in Node. A market that can't be read is skipped (returns null)
// and never breaks a whole list.

const POLYMARKET_URL = "https://polymarket.com";
const RESOLVED_HIGH = 0.99;
const RESOLVED_LOW = 0.01;

// Gamma sends several fields as JSON *inside a string*:
//   outcomes: "[\"Yes\", \"No\"]"   outcomePrices: "[\"0.195\", \"0.805\"]"
export function parseJsonList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// Gamma mixes formats: "2025-11-04T19:52:57.799278Z" (microseconds) and
// "2026-10-29 19:47:10.221006+00" (a space and a short offset). We always
// return "2026-10-29T19:47:10Z", or null if it isn't a date.
export function toIso(value) {
  if (typeof value !== "string" || value === "") return null;
  const tidy = value
    .trim()
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
  const time = Date.parse(tidy);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Index of "Yes" if the market is exactly a yes/no market, otherwise -1
function yesIndexOf(raw) {
  const outcomes = parseJsonList(raw.outcomes);
  if (!outcomes || outcomes.length !== 2) return -1;
  const names = outcomes.map((name) => String(name).trim().toLowerCase());
  if (!names.includes("yes") || !names.includes("no")) return -1;
  return names.indexOf("yes");
}

export function yesPriceOf(raw) {
  const index = yesIndexOf(raw);
  if (index === -1) return null;
  return toNumber(parseJsonList(raw.outcomePrices)?.[index]);
}

export function yesTokenIdOf(raw) {
  const index = yesIndexOf(raw);
  if (index === -1) return null;
  const tokenId = parseJsonList(raw.clobTokenIds)?.[index];
  return tokenId ? String(tokenId) : null;
}

// open = trading; resolved = closed with a clear 0 or 1 price; closed = the
// rest (closed but not settled yet, or settled 50/50)
export function statusOf(raw, yesPrice = yesPriceOf(raw)) {
  if (!raw.closed) return { status: "open", outcome: null };
  if (yesPrice !== null && yesPrice >= RESOLVED_HIGH) return { status: "resolved", outcome: "YES" };
  if (yesPrice !== null && yesPrice <= RESOLVED_LOW) return { status: "resolved", outcome: "NO" };
  return { status: "closed", outcome: null };
}

// ---- Categories ------------------------------------------------------------
// Gamma's own `category` field is always null, so we map tag slugs and labels
// into our 8 categories. First match wins, in this order.

const TAGS = {
  Crypto: ["crypto", "bitcoin", "ethereum", "solana", "xrp", "dogecoin", "crypto-prices", "stablecoins", "airdrops", "memecoins", "pre-market"],
  Sports: [
    "sports", "nfl", "nba", "mlb", "nhl", "wnba", "ncaa", "soccer", "football", "basketball", "baseball", "hockey",
    "tennis", "golf", "f1", "formula-1", "formula 1", "ufc", "mma", "boxing", "cricket", "esports", "chess",
    "olympics", "ucl", "epl", "champions-league", "premier-league", "world-cup",
  ],
  Economy: [
    "economy", "finance", "business", "fed", "fed-rates", "economic-policy", "inflation", "stocks", "ipo", "ipos",
    "commodities", "interest-rates", "earnings", "gdp", "tariffs", "oil", "equities", "treasuries", "recession",
  ],
  "Tech & Science": ["tech", "technology", "ai", "science", "space", "openai", "spacex", "big-tech", "artificial-intelligence"],
  World: ["world", "geopolitics", "foreign-policy", "middle-east", "ukraine", "russia", "china", "israel", "europe", "global-elections"],
  Politics: ["politics", "elections", "us-election", "us-politics", "congress", "senate", "midterms", "trump", "president", "governor-elections"],
  Culture: [
    "culture", "pop-culture", "entertainment", "movies", "music", "awards", "celebrities", "tv", "tweet-markets",
    "elon-tweets", "mentions", "oscars", "grammys",
  ],
};

// A foreign-politics tag only means World when nothing points at the US.
// "Will the U.S. invade Iran?" is tagged Geopolitics *and* Trump: Politics.
const US_TAGS = ["united-states", "united states", "us-election", "us-politics", "trump", "congress", "senate", "midterms", "u.s. x iran", "trump-iran"];

// Fallback for markets without tags (search results, some closed markets)
const KEYWORDS = [
  ["Crypto", /\b(bitcoin|btc|ethereum|eth|solana|xrp|dogecoin|crypto|fdv|token)\b/i],
  ["Sports", /\b(nba|nfl|mlb|nhl|fifa|world cup|super bowl|champions league|premier league|grand prix|ufc|tennis|golf|open championship|world series|stanley cup)\b/i],
  ["Economy", /\b(fed|interest rates?|inflation|cpi|gdp|recession|ipo|s&p|nasdaq|dow|crude oil|treasury|yield|tariffs?)\b/i],
  ["Tech & Science", /\b(ai model|openai|chatgpt|gpt-\d|spacex|nasa|starship|apple|nvidia)\b/i],
  ["Politics", /\b(election|president|presidential|senate|congress|governor|prime minister|parliament|nominee|trump)\b/i],
];

export function categoryOf(tags, question = "") {
  const names = new Set();
  for (const tag of tags ?? []) {
    if (tag?.slug) names.add(String(tag.slug).toLowerCase());
    if (tag?.label) names.add(String(tag.label).toLowerCase());
  }
  const has = (list) => list.some((name) => names.has(name));

  if (has(TAGS.Crypto)) return "Crypto";
  if (has(TAGS.Sports)) return "Sports";
  if (has(TAGS.Economy)) return "Economy";
  if (has(TAGS["Tech & Science"])) return "Tech & Science";
  if (has(TAGS.World) && !has(US_TAGS)) return "World";
  if (has(TAGS.Politics)) return "Politics";
  if (has(TAGS.World)) return "World";
  if (has(TAGS.Culture)) return "Culture";

  for (const [category, pattern] of KEYWORDS) {
    if (pattern.test(question)) return category;
  }
  return "Other";
}

// ---- Markets ---------------------------------------------------------------

// raw: one Gamma market. context: what a search result knows about the event
// it came from (its tags and slug), because those markets have neither.
export function normalizeMarket(raw, context = {}) {
  if (!raw || typeof raw !== "object" || raw.id === undefined) return null;
  if (yesIndexOf(raw) === -1) return null;

  const question = cleanText(raw.question);
  const endDate = toIso(raw.endDate);
  if (!question || !endDate) return null;

  const crowdProbability = yesPriceOf(raw);
  const eventSlug = context.eventSlug ?? raw.events?.[0]?.slug ?? null;
  const slug = eventSlug ?? cleanText(raw.slug);

  return {
    id: `pm-${raw.id}`,
    source: "polymarket",
    question,
    category: categoryOf(raw.tags ?? context.tags, question),
    imageUrl: cleanText(raw.image) ?? cleanText(raw.icon),
    endDate,
    createdAt: toIso(raw.createdAt) ?? toIso(raw.startDate) ?? endDate,
    ...statusOf(raw, crowdProbability),
    crowdProbability,
    volume: toNumber(raw.volumeNum) ?? toNumber(raw.volume) ?? 0,
    sourceUrl: slug ? `${POLYMARKET_URL}/event/${slug}` : POLYMARKET_URL,
    weekChange: toNumber(raw.oneWeekPriceChange),
    sparkline: null,
  };
}

export function normalizeMarketDetail(raw, context = {}) {
  const market = normalizeMarket(raw, context);
  if (!market) return null;
  return {
    ...market,
    description: cleanText(raw.description) ?? "",
    startDate: toIso(raw.startDate),
  };
}

// Normalises a list, skipping anything that isn't a readable yes/no market
export function normalizeMarkets(rawList, context = {}) {
  const markets = [];
  for (const raw of rawList) {
    const market = normalizeMarket(raw, context);
    if (market) markets.push(market);
  }
  return markets;
}

// Gamma /public-search: { events: [{ slug, tags, markets: [...] }] }.
// Only open markets, each once.
export function normalizeSearch(response) {
  const seen = new Set();
  const markets = [];
  for (const event of response?.events ?? []) {
    const context = { tags: event.tags, eventSlug: event.slug };
    for (const market of normalizeMarkets(event.markets ?? [], context)) {
      if (market.status !== "open" || seen.has(market.id)) continue;
      seen.add(market.id);
      markets.push(market);
    }
  }
  return markets;
}

// ---- Price history ---------------------------------------------------------

// Keeps at most `max` evenly spaced items, always including the first and
// the last, so the chart keeps its true start and its current value
export function downsample(items, max) {
  if (items.length <= max) return items;
  if (max < 2) return items.slice(-max);
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => items[Math.round(index * step)]);
}

// CLOB { history: [{ t: unix seconds, p }] } -> [{ t: ISO, p }], oldest first
export function normalizeHistory(response, max = 200) {
  const points = [];
  for (const point of response?.history ?? []) {
    const t = toNumber(point?.t);
    const p = toNumber(point?.p);
    if (t === null || p === null || p < 0 || p > 1) continue;
    points.push({ t, p });
  }
  points.sort((a, b) => a.t - b.t);
  return downsample(points, max).map(({ t, p }) => ({
    t: new Date(t * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
    p,
  }));
}

// The card's mini chart: up to 16 prices from a week of history
export function sparklineFrom(points, size = 16) {
  return downsample(points, size).map((point) => point.p);
}
