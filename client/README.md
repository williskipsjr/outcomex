# client

The OutcomeX web app: React 19, Vite and React Router, with plain CSS. How to run it is in the [root README](../README.md).

## How `src/` is organised

| Folder | What lives there |
|---|---|
| `main.jsx`, `App.jsx` | Start-up (router and the two app-wide providers) and the list of pages |
| `features/` | One folder per part of the product: `dashboard`, `market` (detail, call, reveal), `practice-list`, `calls` (My Calls and where calls are saved), `settings` (blind mode, theme), `about`. `kit` is a page of every shared component, only in development (`/kit`) |
| `components/` | Small shared pieces with no data of their own: buttons, selects, error and empty states, skeletons, the nav bar |
| `hooks/` | Reusable React logic: `useRequest` (the loading / success / error state of one request), auto-refresh, debounce |
| `lib/` | Plain functions with no React: scoring, formatting, filters and sorting, chart maths. Most have a `.test.js` next to them |
| `data/` | The only code that talks to the outside world (Polymarket and our JSON files). See [data/README.md](src/data/README.md) |
| `mocks/` | Saved responses for offline mode (`npm run dev:mock`) |
| `styles/` | Design tokens (colours, spacing, both themes) and base styles |

## Rules the code follows

- **Components never call `fetch`.** They ask the data layer, usually through `useRequest`, so every request has the same loading, error, retry and cancel behaviour.
- **Calls are stored once.** `features/calls` keeps the list of calls; scores, summaries and "already called" badges are worked out from it, never saved separately.
- **Nothing from outside is trusted.** The app has no server, so the checks a server would do happen here:
  - `data/validate.js` checks every argument before a request is made (ids, search text, ranges, probabilities).
  - `data/normalize.js` and `data/files.js` check every response and file before the app uses it, and turn anything broken into a `DataError`.
  - `lib/callInput.js` checks what you type into the call box, and `features/calls/callsStorage.js` checks saved calls when they are loaded, keeping the good ones and dropping any that are broken.
