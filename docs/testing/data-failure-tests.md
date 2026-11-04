# Failure tests: data layer and ML files

Tested in a real browser, on 5 Nov 2026 on branch `feat/finish-ml-role`, except the saved-copy banner and the tampered probability, which were tested on 2 Nov and whose code hasn't changed since. Each failure was simulated inside the page, so no real file or service was touched. The rule being tested is the master plan's: *a dead data source never takes the page down.*

## Results

| Failure | What happens | Result |
|---|---|---|
| Polymarket offline, nothing saved yet | Error card with Try again; Retry loads the markets with no page reload (AT-02) | ✅ |
| Polymarket offline, a saved copy exists | Cards stay, with "Showing saved data from 1 min ago" (AT-20) | ✅ |
| 4 of the 5 market pages fail | Dashboard still loads from the page that arrived (65 markets) | ✅ |
| A source hangs and never answers | Stops at 8 seconds with a timeout (8,013 ms measured) | ✅ |
| Price history fails | Only the chart shows an error, with Retry; the question and call form still work (AT-12) | ✅ |
| Price history fails, a saved copy exists | The chart shows the saved copy | ✅ |
| Answers file is missing | Readable error, your number stays, nothing is saved | ✅ See finding 1 |
| Answers file is broken | Same, and Retry works once the file is back | ✅ |
| Tampered probability of 1.5 | Rejected before the answers file is requested (AT-15) | ✅ |
| Malformed id in the URL | "Market not found" (AT-07) | ✅ |
| `sessionStorage` corrupted | Repairs itself, and the app loads normally | ✅ |
| Saved calls corrupted | One-time notice, and the app doesn't crash (AT-17) | ✅ |
| 8 identical requests at once | They share 5 network requests, one per page, instead of 40 | ✅ |
| AI number changes after a re-run | The reveal keeps the number your call is scored against | ✅ |
| Market leaves `predictions.json` after a re-run | The reveal still shows the saved number | ✅ |
| Whole app with no Polymarket access (`npm run build:mock`) | 0 API calls; dashboard, charts, practice, About and "not found" all work | ✅ |

**Broken `predictions.json`:** covered by automated tests (`client/src/data/files.test.js`), which show it means "AI not available". It wasn't seen in the browser: my attempt landed on a market that already had a call, so the form never showed.

## Findings

1. **Misleading error message.** When our own answers file is missing, the page says "Polymarket isn't responding right now", because `client/src/lib/errorMessages.js` turns the error code into generic text. The data layer has the accurate message ("One of OutcomeX's data files is missing"). This is a frontend file, so it's raised with its owner, not changed here. It matters for the demo, which breaks a data file on purpose.

## Not covered here

- A throttled network (slow 3G).
- Keyboard-only use and phone widths on every page.
- Images in the offline build: market photos come from Polymarket's servers, so with no internet they won't load. The cards keep their size and layout.
