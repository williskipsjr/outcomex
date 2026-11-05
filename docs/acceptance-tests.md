# OutcomeX: acceptance tests

**Owner:** Product Manager · **Version:** 1.0, 5 Nov 2026 · Read with the [user stories](user-stories.md)

An acceptance test describes behaviour a person can check in the browser: steps and the expected result, no code. A feature is **done** when its tests pass on `main` (see the Definition of Done in the master plan). The PM runs them at each checkpoint and writes the result in that checkpoint's report.

Two columns keep the plan and the evidence apart:

- **Built**: whether the behaviour exists on `main` on 5 Nov 2026.
- **Recorded check**: a check someone has actually written down, with its source. "None yet" means it hasn't been run and recorded; it does **not** mean it failed. Automated unit tests are listed where they cover the rule behind a test, but they don't replace the browser check.

Run the app with `cd client && npm run dev` (live data) or `npm run dev:mock` (offline fixtures). The failure switches for mock mode are described in `client/src/data/README.md`.

## Summary

| Id | Behaviour | Owner | Must pass by | Built | Recorded check |
|---|---|---|---|---|---|
| AT-01 | Dashboard loads ≥ 20 markets, skeletons, no layout jump | FE1 | C1 | Yes | None yet |
| AT-02 | Offline → error + Retry; Retry works without reload | FE1 | C1 | Yes | ✅ 5 Nov, failure tests |
| AT-03 | Blind mode hides crowd numbers; probability sort off with a note | FE1 | C1 | Yes | Unit tests (sort rule) |
| AT-04 | Category + status + search combine; count matches; Clear filters | FE1 | C1 | Yes | Unit tests (filter rules) |
| AT-05 | Fast typing: only the final query's results, no flicker | FE1 | C2 | Yes | None yet |
| AT-06 | View in the URL survives reload and shared links | FE1 | C1 | Yes | Unit tests (URL rules) |
| AT-07 | Unknown market → "Market not found" with a link back | FE2 | C1 | Yes | ✅ 5 Nov, failure tests |
| AT-08 | Call it rejects empty, 0, 100, "abc", 150 | FE2 | C1 | Yes | Unit tests (input rules) |
| AT-09 | Double click / double Enter saves one call | FE2 | C1 | Yes | None yet |
| AT-10 | You / Crowd / AI shown; AI unavailable is a normal state | FE2 | C1 | Yes | ✅ 5 Nov, PR #27 review |
| AT-11 | A call can't be edited; reload keeps it and the reveal | FE2 | C1 | Yes | None yet |
| AT-12 | History fails → only the chart errors, with Retry | FE2 | C2 | Yes | ✅ 5 Nov, failure tests |
| AT-13 | Fast range switching ends on the last range picked | FE2 | C2 | Yes | None yet |
| AT-14 | Practice call shows the outcome and three scores at once | FE2 | C3 | Yes | None yet |
| AT-15 | Tampered probability rejected before answers load; broken answers file → error + Retry | BE | C2 | Yes | ✅ 5 Nov, failure tests |
| AT-16 | My Calls summary at ≥ 5 resolved; matches the PM's hand-check sheet | FE2 | C3 | Yes | Blocked: hand-check sheet (PM-08) not written |
| AT-17 | Corrupted saved calls → no crash, one-time notice | FE2 | C3 | Yes | ✅ 5 Nov, failure tests |
| AT-18 | Keyboard only: find, call and see the reveal | FE1 + FE2 | C3 | Yes | None yet |
| AT-19 | 375 px: no sideways scrolling, every action reachable | FE1 + FE2 | C3 | Partly | About page only (4 Nov) |
| AT-20 | Polymarket down + saved copy → data with "out of date" banner | BE + FE1 | C2 | Yes | ✅ 2 Nov, failure tests |
| AT-21 | Light and dark themes readable (WCAG AA) | FE1 | C3 | Yes | Partly: Lighthouse 100 on Practice (light) and About (mobile), 5 Nov |
| AT-22 | Main path with zero console errors | PM | C3 | — | None yet |

---

## AT-01 · Dashboard loads

**Owner** FE1 · **Must pass by** C1 · **Story** US-01

1. Open `/` on a normal connection.
2. Watch the page while it loads, then scroll the full list.

**Expected:** placeholder cards appear first, then at least 20 open yes/no markets. Cards don't move when their images arrive.

## AT-02 · Offline, then Retry

**Owner** FE1 · **Must pass by** C1 · **Stories** US-01, US-14

1. In DevTools, set the network to Offline, clear site data and open `/`.
2. Set the network back to online and press Retry.

**Expected:** an error message with Retry, not a blank page. Retry loads the markets without a page reload.

**Recorded:** ✅ 5 Nov 2026, [testing/data-failure-tests.md](testing/data-failure-tests.md).

## AT-03 · Blind mode

**Owner** FE1 · **Must pass by** C1 · **Story** US-04

1. Make sure blind mode is on (the default) and open `/`.
2. Look at cards you haven't called. Open the sort menu.

**Expected:** uncalled cards show "Call it to reveal" and no crowd number. "Most likely YES" and "Least likely YES" can't be picked, and a note explains why. A link with `?sort=prob-high` falls back to the default sort with the same note.

**Recorded:** the sort rule is covered by `client/src/lib/viewParams.test.js`. Browser check: none yet.

## AT-04 · Filters combine

**Owner** FE1 · **Must pass by** C1 · **Stories** US-02, US-03

1. On `/`, pick two categories, set status to "Closing soon" and type a word.
2. Count the cards. Press Clear filters.

**Expected:** only cards matching all three are shown, and the count above the list matches them. Clear filters shows everything again.

**Recorded:** the filter rules are covered by `client/src/lib/filters.test.js`. Browser check: none yet.

## AT-05 · Latest search wins

**Owner** FE1 · **Must pass by** C2 · **Story** US-02

1. On `/`, type "trum", then quickly "trump election".

**Expected:** only results for "trump election" appear. Results for "trum" never flash, and no error appears for the cancelled request.

## AT-06 · The view is in the link

**Owner** FE1 · **Must pass by** C1 · **Story** US-03

1. On `/`, set a search, a category, a status and a sort.
2. Reload. Then copy the URL into a new tab.

**Expected:** both show the same view. Editing the URL to a nonsense value (for example `?sort=banana`) falls back to the default, with no error.

**Recorded:** the URL rules are covered by `client/src/lib/viewParams.test.js`. Browser check: none yet.

## AT-07 · Market not found

**Owner** FE2 · **Must pass by** C1 · **Story** US-05

1. Open `/market/does-not-exist`.

**Expected:** "Market not found" with a link back to the dashboard.

**Recorded:** ✅ 5 Nov 2026, [testing/data-failure-tests.md](testing/data-failure-tests.md) (malformed id).

## AT-08 · Call it rejects bad input

**Owner** FE2 · **Must pass by** C1 · **Story** US-07

1. Open a market you haven't called.
2. Try each of these in the number field and press Call it: empty, `0`, `100`, `abc`, `150`.

**Expected:** each time, an error appears beside the input and nothing is saved (My Calls stays unchanged).

**Recorded:** the input rules are covered by `client/src/lib/callInput.test.js`. Browser check: none yet.

## AT-09 · One call per click

**Owner** FE2 · **Must pass by** C1 · **Story** US-07

1. Open a market you haven't called and enter a valid number.
2. Double-click Call it (or press Enter twice quickly).

**Expected:** exactly one call appears in My Calls.

## AT-10 · The reveal

**Owner** FE2 · **Must pass by** C1 · **Story** US-08

1. Call a market that has an AI number, then one that doesn't.

**Expected:** You, Crowd and AI appear side by side with one sentence about the difference. Without an AI number, the AI row says "AI not available for this market" in a normal style, and everything else works.

**Recorded:** ✅ 5 Nov 2026, in the review of PR #27: the AI row showed its number with the date it was estimated, and kept the saved number after the predictions file changed.

## AT-11 · A call is locked

**Owner** FE2 · **Must pass by** C1 · **Stories** US-04, US-13

1. Call a market. Look for a way to change the number.
2. Reload the page.

**Expected:** there is no way to edit the call. After reload the call and the reveal are still there.

## AT-12 · Chart fails alone

**Owner** FE2 · **Must pass by** C2 · **Stories** US-09, US-14

1. In mock mode, switch price history to fail (see `client/src/data/README.md`) and open a market.

**Expected:** the question and the call form work. Only the chart shows an error, with Retry.

**Recorded:** ✅ 5 Nov 2026, [testing/data-failure-tests.md](testing/data-failure-tests.md).

## AT-13 · Chart ranges

**Owner** FE2 · **Must pass by** C2 · **Story** US-09

1. On a market with the chart visible, click 1D, 1W and 1M quickly.

**Expected:** the chart ends on 1M, the last range clicked.

## AT-14 · Practice scores at once

**Owner** FE2 · **Must pass by** C3 · **Story** US-10

1. Open `/practice`, pick a question and call it.

**Expected:** the outcome (Resolved YES / NO) appears straight away, with your score, the crowd's score on the as-of date and, if it had one, the AI's.

## AT-15 · Practice can't be tricked into an answer

**Owner** BE · **Must pass by** C2 · **Story** US-10

1. Send a practice reveal with probability 1.5 (or any tampered input).
2. Make the answers file missing, then broken, and call a practice question.

**Expected:** step 1 is rejected with a validation error before the answers file is requested. Step 2 shows a clear error with Retry; your number stays and nothing is saved.

**Recorded:** ✅ 5 Nov 2026, [testing/data-failure-tests.md](testing/data-failure-tests.md). Open finding: the missing-file message says "Polymarket isn't responding" instead of naming our file.

## AT-16 · My Calls summary is correct

**Owner** FE2 · **Must pass by** C3 · **Story** US-11

1. Make at least 5 practice calls from the PM's hand-check sheet.
2. Open My Calls.

**Expected:** the summary appears only from 5 resolved calls. Your, the crowd's and the AI's mean Brier scores match the sheet exactly, each with its sample size, and the AI only counts calls where it had a number.

**Status:** blocked on the scoring hand-check sheet (PM-08, `docs/scoring-check.csv`), which hasn't been written. The scoring formulas are covered by `client/src/lib/scoring.test.js`.

## AT-17 · Corrupted saved calls

**Owner** FE2 · **Must pass by** C3 · **Story** US-13

1. In DevTools → Storage, change `outcomex.v1.calls` to something that isn't valid.
2. Reload.

**Expected:** the app loads with no calls (or the ones it could keep), shows a one-time notice and doesn't crash.

**Recorded:** ✅ 5 Nov 2026, [testing/data-failure-tests.md](testing/data-failure-tests.md). Also covered by `client/src/features/calls/callsStorage.test.js`.

## AT-18 · Keyboard only

**Owner** FE1 + FE2 · **Must pass by** C3 · **Stories** all

1. Without a mouse: find a market, open it, call it and read the reveal.

**Expected:** every step works with the keyboard, and the focus is always visible. A "Skip to content" link is the first thing Tab reaches.

## AT-19 · Phone width

**Owner** FE1 + FE2 · **Must pass by** C3 · **Stories** all

1. Set the browser to 375 px wide and visit every page.

**Expected:** no sideways scrolling of the page, and every action is reachable. Wide tables scroll inside their own box.

**Recorded:** the About page was checked at 375 px on 4 Nov (no page scroll). The other pages: none yet.

## AT-20 · Saved copy when Polymarket is down

**Owner** BE + FE1 · **Must pass by** C2 · **Story** US-14

1. Load the dashboard once. Then block Polymarket (offline in DevTools) and reload.

**Expected:** the dashboard shows the saved markets with "Showing saved data from … Live prices are temporarily unavailable."

**Recorded:** ✅ 2 Nov 2026, [testing/data-failure-tests.md](testing/data-failure-tests.md).

## AT-21 · Both themes are readable

**Owner** FE1 · **Must pass by** C3 · **Stories** all

1. Set Theme to Light, then Dark, and visit every page.

**Expected:** all text and probability labels meet WCAG AA contrast (4.5:1 for normal text). Cards are clearly separate from the page.

**Recorded:** 5 Nov 2026: Lighthouse accessibility 100 on the Practice page in the light theme (PR #28), and 100 on the About page on mobile (PR #26). The light palette was adjusted in PR #28 so that every text colour passes on the page and on cards. Other pages: none yet.

## AT-22 · Clean main path

**Owner** PM · **Must pass by** C3 · **Stories** all

1. With the DevTools console open, go: dashboard → call a market → reveal → practice call → My Calls → About.

**Expected:** zero console errors.
