# OutcomeX: product requirements (PRD)

**Owner:** Product Manager · **Version:** 1.0, 5 Nov 2026 · **Status:** living document; every change is a docs PR with a line in the [changelog](#changelog)

This document says what OutcomeX is for, what it was planned to deliver, and what it delivers today. Each scope table keeps the two apart: the **plan** column is the requirement from the master plan (v1.1, 24 Oct 2026), and the **now** column is what is on `main` on 5 Nov 2026. Detailed stories are in [user-stories.md](user-stories.md) and the checks that decide "done" are in [acceptance-tests.md](acceptance-tests.md).

## 1. Summary

OutcomeX is a forecasting practice app built on live prediction-market questions from Polymarket. You commit your own probability for a yes/no question **before** you see the crowd's price or the AI's estimate. After that the three numbers appear side by side, and once the question resolves every forecast is scored with the Brier score, so over time you can see whether you, the crowd or the AI forecasts best.

Tagline: **"Call it before you peek."**

OutcomeX reads market data; it does not run a market. There is no buying, selling, betting or money of any kind, real or virtual, and nothing in it is financial advice.

## 2. Problem and users

### 2.1 The problem

- Prediction markets turn opinions into probabilities, but nobody tells you whether **your own** judgement is any good.
- Seeing the crowd's number first anchors you. You can't learn to forecast if you always peek.
- "AI predicts the election" claims are everywhere, but they rarely come with an honest track record against a simple baseline.

### 2.2 Who it is for

| Persona | What they want | What OutcomeX gives them |
|---|---|---|
| **The curious student** follows the news and has opinions on elections, sport and crypto | To find out whether their instincts are any good | Live questions, a blind call, then a comparison with the crowd |
| **The forecasting learner** wants to get better, not just feel right | Fast feedback and a score that rewards being calibrated, not lucky | Practice mode on already-resolved markets, scored straight away with the Brier score |

### 2.3 Product principles

1. **Commit before you peek.** Your number is locked before the crowd and the AI are shown.
2. **Honest numbers.** Every score states its sample size. The AI is shown only because it passed an evaluation, and its track record is public on the About page.
3. **The unhappy path is part of the product.** Every section has its own loading, error, empty and retry state. A dead data source never takes the page down.
4. **One source of truth.** Calls are stored once; scores, summaries and the visible lists are worked out from them.
5. **We read markets, we don't run one.** No money, no trading, no financial advice.

## 3. Goals and non-goals

### 3.1 Goals for v1.0 (MVP by C3, Sun 22 Nov; v1.0 on Sat 5 Dec)

- A first-time visitor can find a market, make a blind call and see You vs Crowd vs AI without help.
- Practice mode gives an instant, explained score.
- My Calls shows, on the same questions, whether you beat the crowd and the AI.
- The app keeps working, with clear messages, when a data source is slow, down or broken.

### 3.2 Out of scope (unchanged since v1.1)

- Buying, selling, order books, wallets, coins or money of any kind, real or virtual.
- User accounts, passwords, OAuth or email. Your data stays in your browser.
- A backend server or database.
- Scraping websites that forbid it, and Twitter/X or Reddit scraping.
- Deep learning, LLM fine-tuning or GPU training.
- WebSockets, Redux/Zustand, Tailwind, component libraries or a TypeScript migration.

## 4. Scope: planned vs built

Status words used in this document:

- **Built**: on `main` and working as described.
- **Partly built**: on `main`, but part of the requirement is missing (the gap is named).
- **Prepared**: the pieces are in the repository, but the user-facing result isn't live yet.
- **Not started**, or **Decided against** with a link to the decision.

"Built" means the behaviour exists. It does not mean the acceptance test has been formally run at a checkpoint; that is tracked in [acceptance-tests.md](acceptance-tests.md).

### 4.1 MVP must-haves (P0)

| Id | Plan | Now (5 Nov) | Status |
|---|---|---|---|
| P0-1 | Live dashboard of open yes/no Polymarket markets with loading, error + retry, empty and stale states | Dashboard loads the 100 most-traded open yes/no markets (read from 5 pages of Polymarket results). Skeleton cards while loading, an error card with Retry, empty states, and a "Showing saved data from …" banner when a saved copy is used | Built |
| P0-2 | Search (instant local + remote), category and status filters, sort; view saved in the URL | Typing filters the loaded markets instantly; for 3+ characters with few local matches, Polymarket is searched too (one request after typing stops, older answers discarded). Category chips, status (open / closing soon / all), five sorts. The whole view lives in the URL | Built |
| P0-3 | Blind mode, on by default: crowd numbers hidden on cards you haven't called | On by default, toggle in the nav, remembered in the browser. Uncalled cards show "Call it to reveal". Probability sorts are switched off with a note, and the "Top movers" strip is hidden | Built |
| P0-4 | Market detail: question, rules, dates, source link, price history (after your call) | Question, category, closing date, volume, "View on Polymarket" link, collapsible rules. The chart (1D / 1W / 1M / All) appears after your call, or straight away with blind mode off | Built |
| P0-5 | Call it: 1–99% + optional reason, validated, locked, saved locally | Slider plus a number field, optional reason (up to 140 characters). Invalid input gets a message beside the field and nothing is saved; a double click saves one call. The call is locked and kept in the browser | Built |
| P0-6 | Reveal: You vs Crowd vs AI, with a clean state when the AI is unavailable | Three bars side by side and one sentence on the biggest difference. The AI row shows its number with the date it was estimated, or "AI not available for this market" as a normal (non-error) state | Built |
| P0-7 | Practice mode: resolved markets, validated reveal, instant scoring | 39 resolved markets, shown as they looked 7 days before their scheduled end, with a category filter. Your probability is checked before the answer is loaded; then the outcome, the crowd's price that day and the AI's number appear, each with a score | Built |
| P0-8 | My Calls: history, Brier-based accuracy, you vs crowd vs AI summary, export/clear | Table of calls with All / Live / Practice tabs, pending and resolved states, and per-call scores. The You / Crowd / AI summary appears after 5 resolved calls, compared on the same questions. Export to JSON and "Clear all" with a confirmation | Built |
| P0-9 | Data layer: Polymarket services, timeout/retry/abort, cache, stale fallback, one error shape, mock mode | All of it, plus an offline mode (`npm run dev:mock` / `build:mock`) that needs no internet | Built |
| P0-10 | About page: how it works, scoring, data sources, the AI and its track record, disclaimers | All five sections, a worked scoring example, the AI's test result and calibration chart, and a live "Data status" check of each source | Built |
| P0-11 | Responsive to 375 px, keyboard accessible, light and dark themes | Light, dark and "System" themes; skip link, visible focus, keyboard-friendly controls. Lighthouse accessibility scored 100 on the About page (mobile) and the Practice page (light theme). A full keyboard-only and 375 px pass of every page hasn't been recorded yet | Partly built |

### 4.2 MVP should-haves (P1)

| Id | Plan | Now (5 Nov) | Status |
|---|---|---|---|
| P1-1 | Live calls update automatically when their market resolves | When My Calls opens, pending live calls are checked with Polymarket and scored if their market has resolved. A failed check shows a small retry link | Built |
| P1-2 | Dashboard refreshes prices every 60 s and pauses while the tab is hidden | Refreshes every 60 s, pauses while the tab is hidden, and keeps the old cards on screen while it reloads. A Refresh button does the same on demand | Built |
| P1-3 | Public static deployment with an offline fallback | The offline fallback works (`npm run build:mock`). Hosting settings for a static deploy (page refreshes on any route) are in the repository, but there is no public URL yet | Prepared |

### 4.3 Stretch (P2, only after C3)

| Id | Plan | Now (5 Nov) | Status |
|---|---|---|---|
| S1 | News evidence panel from a source that works in the browser | The news-source check found no free source that works from the browser with relevant headlines | Decided against ([decision 003](decisions/003-news-evidence-stays-out.md)) |
| S2 | Calibration chart and forecaster profile | The data is stored with every call; no chart yet | Not started |
| S3 | Kalshi as a second source | — | Not started |
| S4 | Question of the day | — | Not started |
| S5 | Share a result as an image or link | — | Not started |

### 4.4 Built beyond the original plan

These were added during the build. None of them adds money, accounts or a server.

| Addition | What the user sees | Why |
|---|---|---|
| Home page sections | A featured carousel of the 5 most-traded markets, "Closing soon" and "Most traded" rows above the full list | A first-time visitor gets somewhere to start instead of a wall of 100 cards |
| Top movers | The week's biggest price moves, shown only when blind mode is off | Every item is a crowd number, so it must stay hidden in blind mode |
| Card charts | A small 1-week price line on cards whose crowd number is visible | The trend, not only today's number |
| Data status | On the About page, a check of each data source with "Check again" | Users can see for themselves whether a source is down |
| AI estimate date | "Estimated on 4 Nov 2026, from the crowd's price that day" in the reveal | The live crowd price may have moved since the AI number was made |
| Saved AI number | After you call, the reveal keeps the AI number saved with your call, even after the predictions file is refreshed | Your call is scored against that number, so the screen must show the same one |

## 5. UX

### 5.1 Screens

| Id | Screen | Route | Status |
|---|---|---|---|
| S1 | Dashboard (Live markets) | `/` | Built |
| S2 | Market detail | `/market/:id` | Built |
| S3 | Practice list | `/practice` | Built (category filter only; the plan's status filter doesn't apply to resolved markets) |
| S4 | Practice detail | `/practice/:id` | Built |
| S5 | My Calls | `/me` | Built |
| S6 | About | `/about` | Built |
| — | Not found | any other path | Built ("Market not found" for bad market links, a 404 page for everything else) |

Low-fidelity wireframes (PM-04) were planned for `docs/wireframes/` but have not been added; the screens were built from the master plan's screen table and section 4 of this document.

### 5.2 Key flows

1. **Live call:** Dashboard → open a card → read the question and rules → Call it → reveal (You / Crowd / AI) → chart. Later, My Calls scores it once the market resolves.
2. **Practice call:** Practice → pick a question ("Rewind to <date>") → Call it → outcome stamp and three scores straight away.
3. **Check your record:** My Calls → summary after 5 resolved calls → filter Live / Practice → export or clear.

### 5.3 Design rules the product keeps

- **Colour = who said it:** You is always amber, Crowd always blue, AI always violet. Colour is never the only signal; every value also has a text label.
- **Lower is better:** every Brier score is shown with an accuracy number (100 × (1 − Brier), rounded), never instead of it.
- **"AI not available" is normal**, not an error.
- **Errors are per section:** a failed chart or AI request never hides the question or the call form.

## 6. Data and AI

### 6.1 Where the data comes from

| Data | Source | Notes |
|---|---|---|
| Live markets, prices, search, price history | Polymarket's public APIs (Gamma and CLOB), called straight from the browser | Read only. Cached briefly, with a saved copy used when Polymarket is down |
| Practice questions and answers | Files made by our ML pipeline from resolved Polymarket markets | The answers file is public. The app only loads it after you call, but anyone could read it with developer tools. The About page says so |
| AI estimates | `predictions.json`, made offline by our ML pipeline | Covers live markets 1–21 days from their scheduled end. The file has to be regenerated regularly, because prices move |
| Your calls and settings | Your browser (localStorage) | No account and no server; clearing browser data deletes them |

### 6.2 What we claim about the AI

The AI is **the crowd's price, gently recalibrated**. Both evidence gates passed ([decision 001](decisions/001-data-gate-g1.md), [decision 002](decisions/002-ai-level-g2.md)), so the app shows an AI probability (Level A).

- On 117 held-out markets, scored a week before their scheduled end, the AI and the crowd both scored a Brier score of 0.089 (always saying 50% scores 0.25).
- **It is as accurate as the crowd, not more.** It doesn't read the news and knows nothing the crowd doesn't.
- It only gives a number for markets that end within 21 days, because it was tested a week before each market's scheduled end. Everywhere else the app says "AI not available".

Every sentence about the AI on the About page is agreed between the PM and the ML engineer. The full evidence is in [ml/evaluation.md](ml/evaluation.md) and [ml/model-card.md](ml/model-card.md).

## 7. Product decisions

| Decision | Why | Record |
|---|---|---|
| No backend server; the app talks to Polymarket from the browser | Polymarket's APIs answer browser requests (checked 23 Oct), so a server would add work and a point of failure for no user benefit | Master plan v1.1 |
| No money of any kind; the paper-trading idea was removed | OutcomeX is about judgement, not trading | Master plan v1.1 |
| Practice answers in a public file, loaded only after you call | With no server nothing can be kept secret; "call first" is a courtesy, not security, and the About page says so | Master plan v1.1 |
| Gate G1 passed: enough clean data for a model | 830 usable markets (≥ 300 needed), 0 wrong labels out of 30 checked by hand | [001](decisions/001-data-gate-g1.md) |
| AI shown at Level A: a recalibrated crowd | Passed G2 on a leak-free test, narrowly; it ties the crowd | [002](decisions/002-ai-level-g2.md) |
| News evidence stays out of the product | No free source works from the browser with relevant headlines | [003](decisions/003-news-evidence-stays-out.md) |
| The reveal keeps the AI number saved with your call | Your call is scored against it, so the screen shows the same number after the file is refreshed | PR #27 |

## 8. Success metrics

| Metric | Target | How measured | Now (5 Nov) |
|---|---|---|---|
| First call | A first-time user makes a call in under 60 s, without help | Usability test (PM-11), stopwatch | Not measured yet (test planned 19–21 Nov) |
| Practice task | 5 of 5 testers finish a practice call and read their score | Usability test | Not measured yet |
| Robustness | Zero console errors on the main path; every torture test degrades gracefully | AT-22, bug bash | 16 failure cases checked on 5 Nov, all handled ([testing/data-failure-tests.md](testing/data-failure-tests.md)); AT-22 not run yet |
| Accessibility | Lighthouse accessibility ≥ 90 on every page; full keyboard path | AT-18, Lighthouse | 100 on About (mobile) and Practice (light theme); other pages and the keyboard pass not recorded yet |
| Honesty of AI claims | Every AI number on screen has a published track record (n, Brier vs crowd) | About page review with ML | Met: the About page shows n = 117 and the Brier scores, and links the full evaluation |
| Team process | Every member authors ≥ 5 merged PRs and reviews ≥ 5 | GitHub Insights at C4 | Measured at C4 |

## 9. Known limitations

- **AI coverage is small and goes out of date.** The AI only scores markets 1–21 days from their scheduled end, and only on the day the file was made. On 5 Nov only 5 of the 100 dashboard markets had an AI number. The predictions are made again for each release.
- **One misleading message.** When one of our own data files is missing, the page says "Polymarket isn't responding right now" instead of naming the missing file (finding 1 in [testing/data-failure-tests.md](testing/data-failure-tests.md)). Raised with the frontend owner.
- **Offline images.** In the offline build, market photos come from Polymarket's servers and won't load; the cards keep their size.
- **Practice answers can be read** with the browser's developer tools (see 6.1).
- **Your calls live in one browser.** Another device or a cleared browser starts empty; Export is the backup.

## 10. Release plan

| Checkpoint | Date | Exit criteria (summary) |
|---|---|---|
| C0 · Contracts frozen | Wed 28 Oct | PRD, stories and wireframes in `docs/`; data contract and fixtures merged; everyone has merged a PR |
| C1 · Mock-complete | Sun 8 Nov | Core flow works end to end; G1 decided; AT-01 to AT-11 pass in mock mode |
| C2 · Real data | Sun 15 Nov | Real data by default; search, history and practice on real files; G2 recorded |
| C3 · MVP feature-complete | Sun 22 Nov | Every P0 merged; AT-01 to AT-22 pass on `main`; usability test done |
| C4 · Release candidate | Sun 29 Nov | Torture, keyboard and 375 px passes; Lighthouse ≥ 90 everywhere; deployed URL and offline mode work |
| C5 · v1.0 | Sat 5 Dec | `v1.0` tag with release notes; README, decision records and model card final |

Releases use `v0.x` tags until the final `v1.0`. No release has been tagged yet.

### Still to do (PM)

- Copy deck (PM-07) and the scoring hand-check sheet (PM-08) that AT-16 uses.
- Checkpoint reports from C1 onward, in `docs/checkpoints/`.
- Usability test (PM-11), bug bash (PM-12) and final README / release notes (PM-14).

## Changelog

| Date | Change | Why | Approved by |
|---|---|---|---|
| 5 Nov 2026 | First version in the repository: the plan from master plan v1.1 next to what is on `main` on 5 Nov, plus decisions 001–003 | The PRD, stories and acceptance tests weren't in `docs/` yet | Review on the docs PR |
