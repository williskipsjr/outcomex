# Data layer

Everything between the React app and the outside world lives here. There is no backend server: Polymarket's APIs answer browser requests directly, so this folder does the jobs a backend would have done.

**The one rule: components never call `fetch`.** They import from `client/src/data/index.js`, usually through `useRequest`:

```js
import { listMarkets } from "../../data/index.js";

const { status, data, error, run, retry } = useRequest();
useEffect(() => {
  run((signal) => listMarkets({ limit: 100, signal }));
}, [run]);
```

Every function resolves to `{ data, meta }` or rejects with a `DataError` whose `code` is one of seven values. The full contract (functions, shapes, errors, static files) is [docs/contracts/data.md](../../../docs/contracts/data.md).

## Files

| File | What it does |
|---|---|
| `index.js` | Exports every function; picks real or mock with `VITE_USE_MOCKS` |
| `polymarket.js` | D1 `listMarkets`, D2 `searchMarkets`, D3 `getMarket`, D4 `getHistory`, D9 `getStatuses`, D11 `getSparklines` |
| `files.js` | D5 `getPrediction`, D6 `listPractice`, D7 `getPractice`, D8 `revealPractice`, over the ML files in `public/data` |
| `sources.js` | D10 `checkSources` for the About page |
| `normalize.js` | Raw Polymarket → our shapes, plus the category map. Pure, so Node scripts reuse it |
| `http.js` | `fetchJson`: 8 s timeout, one retry for network errors and 5xx, silent aborts |
| `cache.js` | TTL cache in memory, shared in-flight requests, stale copies in sessionStorage |
| `errors.js` | `DataError` and its codes |
| `validate.js` | The input checks every function runs first |
| `mock.js` | The same functions over the fixtures in `src/mocks` |

## Life of one call

1. **Check the input.** A bad id, query or probability rejects with `VALIDATION_ERROR` before any request.
2. **Fresh copy in memory?** Return it (`meta.cache: "hit"`).
3. **Same request already running?** Wait for that one instead of sending another.
4. **Fetch** with an 8 s timeout. Network errors and 5xx are retried once after 300 ms.
5. **Normalise** into the contract shape and store it, in memory and in sessionStorage.
6. **If the source failed** and a copy under 24 h old exists, return it with `meta.stale: true`. Otherwise reject with a `DataError`.

## Mock mode and the failure switch

```bash
VITE_USE_MOCKS=true npm run dev
```

On Windows PowerShell: `$env:VITE_USE_MOCKS="true"; npm run dev`.

Then, in DevTools:

| Run | Effect |
|---|---|
| `localStorage.setItem("outcomex.debug.fail", "RATE_LIMITED")` | Every mock function fails with that code |
| `localStorage.setItem("outcomex.debug.fail", "history,prediction")` | Only those groups fail |
| `localStorage.setItem("outcomex.debug.fail", "history:UPSTREAM_TIMEOUT")` | Pick the code per group |
| `localStorage.setItem("outcomex.debug.aiLevel", "signal")` | The AI row shows signals only (or `"none"`) |
| `localStorage.removeItem("outcomex.debug.fail")` | Back to normal |

Groups: `markets`, `search`, `history`, `prediction`, `practice`, `statuses`.

## Refreshing the fixtures

```bash
node scripts/snapshot-fixtures.mjs
```

Run it from the repository root. It uses this folder's own services in Node, so the fixtures always match the contract. The hand-written edge cases in `src/mocks/edgeCases.js` and the practice fixtures are left alone.
