# OutcomeX data contract

**Version 1.0** · owned by the Backend / Data Engineer · file contracts (§6) co-owned with the AI/ML Engineer

This is the agreement between the React app and the data layer in `client/src/data`. The frontends build against it, the data layer returns exactly these shapes from real sources and from mock fixtures, and the ML pipeline writes the static files in §6. If this file and the code disagree, this file wins and the code is a bug.

Changes follow the contract-change process (master plan §11.5): open an issue, edit this file in a PR that bumps the version and updates the fixtures, get approval from every affected owner. Additive changes (a new optional field or function) can merge any time; breaking changes only at a checkpoint sync. Nobody uses a field or function that isn't in the merged contract.

## Changelog

| Version | Date | Change | Why |
|---|---|---|---|
| 1.0 | 30 Oct 2026 | First version, from master plan Appendix A, checked against live Gamma and CLOB responses | — |
| 1.0 | 30 Oct 2026 | Added optional `Market.weekChange` and `Market.sparkline`, and function D11 `getSparklines` | The dashboard cards already show a weekly change and a mini chart (Kalshi-style redesign). Gamma gives the change for free; the chart needs one CLOB call per market, so it is a separate, cached function the page calls only for cards it shows |

## 1. Conventions

- Components never call `fetch`. They import functions from `client/src/data/index.js`, usually through `useRequest`.
- Every function returns a Promise that resolves to `{ data, meta }` or rejects with a `DataError` (§5).
- Every function that touches the network accepts `{ signal }` (an `AbortSignal`) and passes it down.
- Times are ISO-8601 UTC strings without fractions, e.g. `2026-12-31T23:59:00Z`.
- Probabilities are decimals from 0 to 1. The UI turns them into percentages.
- Market ids are the Polymarket id with a source prefix: `pm-665374`. Practice ids use `pr-`.
- `VITE_USE_MOCKS=true` makes every function return fixtures from `client/src/mocks` instead (§7).

`meta` on every success:

| Field | Type | Meaning |
|---|---|---|
| `fetchedAt` | ISO string | When this data was fetched from its source (for a cache hit: when it was originally fetched) |
| `stale` | boolean | `true` when the source failed and a saved copy (up to 24 h old) was returned |
| `cache` | `"hit"` \| `"miss"` \| `"stale"` | Where the result came from |
| `source` | string | `"polymarket"`, `"predictions.json"`, `"practice"` or `"mock"` |

## 2. Functions

| Id | Function | Purpose and source | Main user | Cache | Scope |
|---|---|---|---|---|---|
| D1 | `listMarkets({ limit, signal })` | Open yes/no markets, busiest in the last 24 h first, at most 3 per event. Gamma `/markets`. Filtering, sorting and local search happen in the UI | FE1 | 60 s | MVP |
| D2 | `searchMarkets({ q, limit, signal })` | Open yes/no markets matching a query. Gamma `/public-search` | FE1 | 30 s | MVP |
| D3 | `getMarket(id, { signal })` | One market with its description and rules. Gamma `/markets/{id}` | FE2 | 60 s | MVP |
| D4 | `getHistory(id, range, { signal })` | Crowd probability over time. CLOB `/prices-history` on the YES token | FE2 | 5 min | MVP |
| D5 | `getPrediction(id, { signal })` | AI probability or a structured "not available". Static `predictions.json` | FE2 | file, 5 min | MVP |
| D6 | `listPractice({ limit, category, signal })` | Practice markets, without outcome or crowd price. Static `practice-list.json` | FE1 | file | MVP |
| D7 | `getPractice(id, { signal })` | One practice market, still without the answer. Static `practice-list.json` | FE2 | file | MVP |
| D8 | `revealPractice(id, probability, { signal })` | Checks the probability first, then loads `practice-answers.json` | FE2 | file | MVP |
| D9 | `getStatuses(ids, { signal })` | Status and outcome for up to 50 market ids (resolution check for My Calls). Gamma `/markets?id=…` | FE2 | 60 s | P1 |
| D10 | `checkSources()` | One status line per source and file for the About page | FE1 | none | P1 |
| D11 | `getSparklines(ids, { signal })` | Up to 16 recent YES prices per market for the card charts. CLOB, one call per market, at most 4 at a time | FE1 | 5 min | MVP (added in 1.0) |

### 2.1 Inputs, results and errors

| Function | Input check | `data` | Errors |
|---|---|---|---|
| D1 `listMarkets` | `limit` integer 1–200, default 100 | `Market[]` | `UPSTREAM_*`, `RATE_LIMITED`, `INVALID_DATA` (only when no stale copy exists) |
| D2 `searchMarkets` | `q` 2–80 characters after trimming; `limit` 1–50, default 20 | `Market[]` | `VALIDATION_ERROR`, `UPSTREAM_*`, `RATE_LIMITED`, `ABORTED` |
| D3 `getMarket` | `id` matches `pm-<digits>` | `MarketDetail` | `VALIDATION_ERROR`, `NOT_FOUND`, `UPSTREAM_*` |
| D4 `getHistory` | `id` as above; `range` one of `1d`, `1w`, `1m`, `all` | `{ range, points: [{ t, p }] }`, oldest first, at most 200 points | `VALIDATION_ERROR`, `NOT_FOUND`, `UPSTREAM_*`, `ABORTED` |
| D5 `getPrediction` | `id` as above | `Prediction`. Never rejects for a valid id: a missing or broken file is `available: false` | `VALIDATION_ERROR` |
| D6 `listPractice` | `limit` 1–200, default all; `category` optional, one of the 8 | `PracticeMarket[]` | `VALIDATION_ERROR`, `INVALID_DATA`, `UPSTREAM_UNAVAILABLE` |
| D7 `getPractice` | `id` matches `pr-<digits>` | `PracticeMarket` | `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_DATA` |
| D8 `revealPractice` | `id` as above; `probability` a finite **number** 0.01–0.99 | `Reveal` | `VALIDATION_ERROR` (before anything is loaded), `NOT_FOUND`, `INVALID_DATA`, `UPSTREAM_UNAVAILABLE` |
| D9 `getStatuses` | 1–50 valid market ids | `[{ id, status, outcome }]`; unknown ids are left out | `VALIDATION_ERROR`, `UPSTREAM_*` |
| D10 `checkSources` | — | `[{ name, ok, detail }]` | never rejects |
| D11 `getSparklines` | 1–50 valid market ids | `{ "<marketId>": number[] }`; a market whose history failed is left out | `VALIDATION_ERROR`, `ABORTED` |

## 3. Objects

### 3.1 Market

| Field | Type | Meaning | Example |
|---|---|---|---|
| `id` | string | Source-prefixed id | `pm-665374` |
| `source` | `"polymarket"` | Where the data came from | `polymarket` |
| `question` | string | The yes/no question | `Will the U.S. invade Iran before 2027?` |
| `category` | enum | `Politics` · `Sports` · `Crypto` · `Economy` · `Tech & Science` · `World` · `Culture` · `Other` | `Politics` |
| `imageUrl` | string \| null | Thumbnail URL | `https://polymarket-upload…jpg` |
| `endDate` | ISO string | When trading closes | `2027-01-01T04:59:00Z` |
| `createdAt` | ISO string | Used for the "newest" sort | `2025-11-04T19:52:57Z` |
| `status` | `"open"` \| `"closed"` \| `"resolved"` | Lifecycle state | `open` |
| `outcome` | `"YES"` \| `"NO"` \| null | Only when resolved | `null` |
| `crowdProbability` | number \| null | Current YES price, 0–1 | `0.195` |
| `volume` | number | Traded volume in USD, for display and sorting only | `75894718.6` |
| `sourceUrl` | string | The market's page on Polymarket | `https://polymarket.com/event/…` |
| `weekChange` | number \| null | *Optional (1.0).* Change of the YES price over the last 7 days, in probability units (`0.03` = up 3 points) | `0.03` |
| `sparkline` | number[] \| null | *Optional (1.0).* Up to 16 recent YES prices, oldest first. `null` from D1/D2; filled in by D11 | `null` |

`MarketDetail` is a `Market` plus:

| Field | Type | Meaning | Example |
|---|---|---|---|
| `description` | string | Full description including the resolution rules, plain text | `This market will resolve to "Yes" if…` |
| `startDate` | ISO string \| null | When the market opened | `2025-11-05T17:52:17Z` |

### 3.2 Prediction

| Field | Type | Meaning | Example |
|---|---|---|---|
| `marketId` | string | Same id as the market | `pm-665374` |
| `available` | boolean | `true` only when `probability` is a number | `true` |
| `level` | `"model"` \| `"signal"` \| `"none"` | Which ML level is live (master plan §9.2) | `model` |
| `probability` | number \| null | AI probability of YES, 0–1 | `0.21` |
| `modelVersion` | string \| null | From `predictions.json` | `lr-2026-11-15` |
| `explanation` | string[] | Up to 3 short reasons, or signal sentences at level `signal` | `["Price rose 3 points in 7 days"]` |
| `generatedAt` | ISO string \| null | When `predictions.json` was produced | `2026-11-19T04:00:00Z` |
| `reason` | null \| `"NOT_SCORED"` \| `"ML_DISABLED"` | Why there is no probability | `null` |

How the data layer derives it from `predictions.json`:

| Situation | `available` | `level` | `reason` |
|---|---|---|---|
| File level `model`, market has a probability | `true` | `model` | `null` |
| File level `signal`, market listed | `false` | `signal` | `null` |
| File loaded, market not in it | `false` | file's level | `NOT_SCORED` |
| File missing, unreadable or the wrong shape | `false` | `none` | `ML_DISABLED` |

### 3.3 PracticeMarket and Reveal

`PracticeMarket`:

| Field | Type | Meaning | Example |
|---|---|---|---|
| `id` | string | Practice id | `pr-558938` |
| `question`, `description`, `category`, `imageUrl` | as in Market | Same meaning as for live markets | — |
| `asOfDate` | ISO string | The moment we "travel back" to: 7 days before close | `2026-07-13T01:24:43Z` |
| `closedDate` | ISO string | When the market closed | `2026-07-20T01:24:43Z` |

`Reveal`:

| Field | Type | Meaning | Example |
|---|---|---|---|
| `id` | string | Practice id | `pr-558938` |
| `outcome` | `"YES"` \| `"NO"` | What happened | `NO` |
| `crowdProbabilityAsOf` | number | Crowd price at `asOfDate` | `0.182` |
| `ai` | `{ available, probability, modelVersion }` | Out-of-sample AI number, if any | `{ available: false, probability: null, modelVersion: null }` |
| `resolvedAt` | ISO string | Resolution time | `2026-07-20T01:24:43Z` |

## 4. Mapping from Polymarket

Checked against live responses on 30 Oct 2026.

| Our field | Gamma field | Rule |
|---|---|---|
| `id` | `id` (a numeric string) | Prefix with `pm-` |
| — | `outcomes` | A JSON **string**, e.g. `"[\"Yes\", \"No\"]"`. Keep the market only if it parses to exactly `Yes`, `No` |
| `crowdProbability` | `outcomePrices` | A JSON string of price strings; take the one at the `Yes` index. `null` if missing or not a number |
| `status` | `active`, `closed`, prices | `open` = active and not closed; `resolved` = closed and the YES price is ≥ 0.99 or ≤ 0.01; otherwise `closed` |
| `outcome` | prices, when resolved | `YES` if ≥ 0.99, `NO` if ≤ 0.01, else `null` |
| `category` | `tags[].slug` / `label` (requested with `include_tag=true`; search results take the event's tags) | Mapping table in `normalize.js`, first match wins: Crypto, Sports, Economy, Tech & Science, then World (foreign politics with no US tag), Politics, Culture. A small keyword list on the question is the fallback; the default is `Other`. Gamma's own `category` field is always `null` |
| `imageUrl` | `image`, else `icon` | `null` if empty |
| `endDate`, `startDate`, `createdAt` | same names | Re-formatted as ISO without fractions. Gamma sends microseconds, and `closedTime` uses a space instead of `T` |
| `volume` | `volumeNum`, else `volume` | Number, `0` if missing |
| `sourceUrl` | `events[0].slug`, else `slug` | `https://polymarket.com/event/<slug>` |
| `weekChange` | `oneWeekPriceChange` | Number or `null` |
| `description` | `description` | Trimmed; empty string if missing |

Behaviour of the sources that the data layer handles:

- **Which markets the dashboard gets:** sorted by all-time volume, 90 of the top 100 yes/no markets on 30 Oct were Politics, almost all one-candidate rungs of 2028 election "ladders" priced under 3%. D1 therefore sorts by `volume24hr` and keeps at most 3 markets per event (`events[0].slug`). On 30 Oct that gave 62 markets across 6 categories.
- **Unknown market id:** Gamma answers `404` for an id that doesn't exist and `422` for an id it can't parse. Both become `NOT_FOUND`.
- **Open vs closed by id:** `/markets?id=…` only returns open markets unless `closed=true` is sent, and then it only returns closed ones. `getStatuses` makes both requests and merges them.
- **Price history:** CLOB `/prices-history?market=<YES token id>&interval=<1d|1w|1m|max>&fidelity=<minutes>` returns `{ history: [{ t: unix seconds, p }] }`. The YES token id comes from `clobTokenIds` (another JSON string) at the `Yes` index. Fidelity: 5 min for `1d`, 60 for `1w`, 180 for `1m`, 1440 for `all`.
- **CORS:** Gamma and CLOB both send `Access-Control-Allow-Origin: *`. CLOB sits behind Cloudflare, which rejects some non-browser clients (error 1010); browsers and Node's `fetch` are fine.

## 5. Errors

A `DataError` has `code`, `message` (written for people, safe to show) and, for HTTP errors, `status`.

| Trigger | `code` | What the UI does |
|---|---|---|
| Our own input check fails | `VALIDATION_ERROR` | Show the message near the input; don't retry automatically |
| HTTP 404 or 422, unknown id | `NOT_FOUND` | Not-found state with a link back |
| HTTP 429 | `RATE_LIMITED` | "Too many requests, try again in a moment" + Retry |
| HTTP ≥ 500 or a network failure, and no stale copy | `UPSTREAM_UNAVAILABLE` | Error + Retry for that section only |
| No answer within 8 s, and no stale copy | `UPSTREAM_TIMEOUT` | Same as above |
| Bad JSON or the wrong shape | `INVALID_DATA` | Generic error + Retry; details go to the console |
| The caller aborted (newer request, page closed) | `ABORTED` | Nothing. Never shown |

Timeouts and retries: each network call has an 8-second timeout. A network error or a 5xx is retried once after about 300 ms. A 4xx, a timeout and an abort are never retried. The caller's abort becomes `ABORTED`; the data layer's own timeout becomes `UPSTREAM_TIMEOUT`.

## 6. Static files (AI/ML → app)

All three live in `client/public/data/` and are served at `/data/…`. The data layer validates each file's shape when it loads it.

| File | Shape | Rule |
|---|---|---|
| `practice-list.json` | `{ generatedAt, asOfOffsetDays: 7, items: [ { id, question, description, category, imageUrl, asOfDate, closedDate } ] }` | No outcomes and no crowd prices, ever |
| `practice-answers.json` | `{ generatedAt, answers: { "<practiceId>": { outcome, crowdProbabilityAsOf, aiProbability \| null, modelVersion \| null, resolvedAt } } }` | Loaded only after a valid call. `aiProbability` only for test-split markets |
| `predictions.json` | `{ modelVersion, level: "model" \| "signal", generatedAt, metrics: { testBrier, crowdBrier, n }, predictions: { "<marketId>": { probability \| null, explanation: [ …≤ 3 ] } } }` | Updated through a PR that lists the metrics. A missing file means level `none` |

The answers file is public: anyone can read it in DevTools. Loading it only after a valid call is a courtesy, not security, and the About page says so.

## 7. Mock mode and the failure switch

- `VITE_USE_MOCKS=true npm run dev` makes `index.js` export the fixture versions from `mock.js`. Each waits a random 300–900 ms.
- Failure switch, in DevTools: `localStorage.setItem("outcomex.debug.fail", "<value>")`, then reload or retry.
  - A code on its own (`RATE_LIMITED`) makes every mock function fail with it.
  - A list of groups (`markets,history`) makes only those fail, with `UPSTREAM_UNAVAILABLE`.
  - `group:CODE` picks the code per group: `history:UPSTREAM_TIMEOUT`.
  - Groups: `markets` (D1, D3), `search` (D2), `history` (D4, D11), `prediction` (D5), `practice` (D6–D8), `statuses` (D9).
- Fixtures in `client/src/mocks/` are real responses saved by `scripts/snapshot-fixtures.mjs` and already normalised, plus hand-written edge cases.

## 8. Browser storage

| Key | Storage | Contents | Owner |
|---|---|---|---|
| `outcomex.v1.calls` | localStorage | The user's calls (source of truth) | FE2 |
| `outcomex.v1.settings` | localStorage | `{ blindMode, theme }` | FE1 |
| `outcomex.v1.notices` | localStorage | One-time notices already shown | FE2 |
| `outcomex.v1.cache` | sessionStorage | Last good responses for the stale fallback, cleared when the tab closes | BE |
| `outcomex.debug.fail` | localStorage | The failure switch (§7). Development only | BE |

The Call object and its rules are in master plan Appendix A.6 and are owned by FE2.
