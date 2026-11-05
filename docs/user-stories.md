# OutcomeX: user stories

**Owner:** Product Manager · **Version:** 1.0, 5 Nov 2026 · Read with the [PRD](PRD.md)

These are the 14 agreed stories from the master plan (v1.1). Each one has its acceptance criteria in Given / When / Then form, the acceptance tests that verify it ([acceptance-tests.md](acceptance-tests.md)), and a short note on **what is built today** on `main`. "Built" means the behaviour exists; the formal acceptance run happens at the checkpoints.

| Id | Story (short) | Priority | Status (5 Nov) |
|---|---|---|---|
| US-01 | Browse open markets | P0 | Built |
| US-02 | Search by keyword | P0 | Built |
| US-03 | Filter, sort and keep the view in the link | P0 | Built |
| US-04 | Crowd hidden until I commit | P0 | Built |
| US-05 | Read the question and rules first | P0 | Built |
| US-06 | News headlines as evidence | P2 (S1) | Decided against |
| US-07 | Commit my own probability | P0 | Built |
| US-08 | Compare with the crowd and the AI | P0 | Built |
| US-09 | See how the crowd price moved | P0 | Built |
| US-10 | Practise on resolved markets | P0 | Built |
| US-11 | See my history and whether I beat the crowd and the AI | P0 | Built |
| US-12 | Understand scoring, the AI and the data | P0 | Built |
| US-13 | Keep, export or delete my calls | P0 | Built |
| US-14 | Keep working when a data source is down | P0 | Built |

---

## US-01 · Browse open markets

As a **visitor**, I want to browse open markets, so that I can find questions I have an opinion on.

- **Given** I open the dashboard, **when** the markets are loading, **then** I see placeholder cards in the shape of the real ones.
- **Given** the markets have loaded, **then** I see at least 20 open yes/no markets as cards, each with the question, category, volume and time left.
- **Given** the market images load late, **then** the cards don't jump.

**Verified by:** AT-01, AT-02 · **Built now:** the dashboard shows the 100 most-traded open yes/no markets, with a featured carousel and "Closing soon" and "Most traded" rows above the full list.

## US-02 · Search by keyword

As a **visitor**, I want to search markets by keyword, so that I can find a specific topic fast.

- **Given** markets are loaded, **when** I type, **then** the list narrows instantly to questions containing my words.
- **Given** few loaded markets match a query of 3 or more characters, **when** I stop typing, **then** Polymarket is searched as well and the extra results are shown separately.
- **Given** I keep typing, **then** only results for my final query appear, with no flicker of older results and no error for the cancelled ones.

**Verified by:** AT-04, AT-05 · **Built now:** as described; the wider search waits 300 ms after the last key.

## US-03 · Filter, sort and keep the view

As a **visitor**, I want to filter by category and status and change the sort order, and keep that view when I reload or share the link.

- **Given** I pick categories, a status and a search, **then** they combine (all must match) and the count matches the visible cards.
- **Given** a filtered view, **when** I press Clear filters, **then** everything is shown again.
- **Given** a filtered view, **when** I reload or open the copied link, **then** I see the same view. A link with unknown values falls back to the defaults.

**Verified by:** AT-04, AT-06 · **Built now:** 8 categories, status (open, closing within 7 days, all) and 5 sorts (ending soonest, volume, newest, most and least likely YES). The Practice list has the category filter, also kept in the link.

## US-04 · Crowd hidden until I commit

As a **forecaster**, I want the crowd's number hidden until I commit, so that it doesn't anchor my judgement.

- **Given** blind mode is on (the default), **then** cards I haven't called show "Call it to reveal" instead of the crowd's number.
- **Given** blind mode is on, **then** sorting by probability is switched off with a short explanation.
- **Given** I have called a market, **then** its card and page show the crowd's number.

**Verified by:** AT-03, AT-11 · **Built now:** as described. Blind mode also hides the chart and the AI on the market page until you call, and hides the "Top movers" strip on the dashboard. The setting is remembered in the browser.

## US-05 · Read the question and rules first

As a **forecaster**, I want to read the question, resolution rules and closing date before I decide.

- **Given** I open a market, **then** I see the question, category, closing date, volume, a link to the market on Polymarket, and the rules (collapsible).
- **Given** a link to a market that doesn't exist, **then** I see "Market not found" with a link back to the dashboard.

**Verified by:** AT-07 · **Built now:** as described.

## US-06 · News headlines as evidence (stretch S1)

As a **forecaster**, I want recent news headlines about the question as evidence.

**Status: decided against.** The news-source check (5 Nov) found no free source that answers from the browser with relevant headlines. See [decision 003](decisions/003-news-evidence-stays-out.md). Nothing in the MVP depends on it.

## US-07 · Commit my own probability

As a **forecaster**, I want to commit my own probability with an optional reason, so that I'm scored on my judgement and not on the crowd's.

- **Given** a market I haven't called, **when** I enter a whole number from 1 to 99 and press Call it, **then** my call is saved, locked and the reveal appears.
- **Given** I enter 0, 100, 150, "abc" or nothing, **when** I press Call it, **then** an error appears beside the input and nothing is saved.
- **Given** I double-click Call it, **then** exactly one call is saved.

**Verified by:** AT-08, AT-09, AT-11 · **Built now:** a slider and a number field that stay in step, and an optional reason of up to 140 characters. The button stays disabled until you move the slider or type a number, so nobody calls 50% by accident.

## US-08 · Compare with the crowd and the AI

As a **forecaster**, I want to compare my number with the crowd and the AI right after committing.

- **Given** I have just called, **then** You, Crowd and AI appear side by side, with one sentence about the biggest difference.
- **Given** the AI has no number for this market, **then** its row says so in a normal style and everything else works.

**Verified by:** AT-10 · **Built now:** as described. The AI row shows the date its number was estimated. After you call, the reveal keeps the AI number saved with your call, even after the predictions file is refreshed, because that is the number your call is scored against.

## US-09 · See how the crowd price moved

As a **forecaster**, I want to see how the crowd price moved over time, with my call drawn on the chart.

- **Given** I have called (or blind mode is off), **then** a price chart shows the crowd's probability with 1D, 1W, 1M and All ranges, and my call and the AI's number as lines.
- **Given** the price history fails, **then** only the chart shows an error with Retry.
- **Given** I switch ranges quickly, **then** the chart always ends on the last range I picked.

**Verified by:** AT-12, AT-13 · **Built now:** as described, with a text summary of the chart for screen readers.

## US-10 · Practise on resolved markets

As a **learner**, I want to practise on already-resolved markets and get scored instantly.

- **Given** the Practice list, **then** I see resolved questions with the date I'm "rewinding" to.
- **Given** I call a practice question, **then** the outcome appears straight away with my score, the crowd's score and, if it had one, the AI's.
- **Given** a tampered probability (for example 1.5), **then** it is rejected before any answer loads. A missing or broken answers file shows an error with Retry, and my number stays.

**Verified by:** AT-14, AT-15 · **Built now:** 39 practice questions, each shown as it looked 7 days before its scheduled end, with an AI number from a model that never trained on that question. Questions about deaths, tragedies and violence against private people are left out, and a person reads every question before it ships.

## US-11 · See my history and whether I beat the crowd and the AI

As a **forecaster**, I want to see my history and whether I beat the crowd and the AI.

- **Given** fewer than 5 resolved calls, **then** My Calls explains that the summary appears at 5 and suggests Practice.
- **Given** 5 or more resolved calls, **then** I see my average Brier score and accuracy next to the crowd's and the AI's, each with its sample size. The AI is compared only on calls where it had a number.
- **Given** pending live calls, **when** I open My Calls, **then** any whose market has resolved are scored.

**Verified by:** AT-16 · **Built now:** as described, with All / Live / Practice tabs.

## US-12 · Understand scoring, the AI and the data

As a **visitor**, I want to understand how scoring and the AI work, and what the data is.

- **Given** I open About, **then** I find how it works, how scoring works (with a worked example), where the data comes from, the AI and its track record, and the disclaimers.
- **Given** any number about the AI, **then** it matches the published evaluation.

**Verified by:** AT-22 · **Built now:** all five sections, the AI's test result (n = 117) and calibration chart, and a live "Data status" check of each data source. The AI numbers were confirmed by the ML engineer in the About page review.

## US-13 · Keep, export or delete my calls

As a **user**, I want my calls kept after closing the browser, and I want to export or delete them.

- **Given** I made calls, **when** I close and reopen the browser, **then** they are still there and still locked.
- **Given** My Calls, **when** I press Export, **then** I get a JSON file of my calls; **when** I press Clear all and confirm, **then** they are deleted.
- **Given** the saved calls are corrupted, **then** the app loads with what it can keep, shows a one-time notice and doesn't crash.

**Verified by:** AT-11, AT-17 · **Built now:** as described.

## US-14 · Keep working when a data source is down

As a **user**, I want the app to keep working with clear messages when a data source is down.

- **Given** Polymarket is unreachable and nothing is saved, **then** I see an error with Retry, and Retry works without a page reload.
- **Given** Polymarket is unreachable but a saved copy exists, **then** I see the saved data with a "may be out of date" banner.
- **Given** one section fails (chart, AI, search), **then** only that section shows an error.

**Verified by:** AT-02, AT-12, AT-20 · **Built now:** as described. Requests stop after 8 seconds and are retried once. The 5 Nov failure tests ([testing/data-failure-tests.md](testing/data-failure-tests.md)) covered 16 cases, all handled. One open finding: a missing OutcomeX data file is described as "Polymarket isn't responding".
