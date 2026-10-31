# ML feasibility report and gate G1 (ML-01)

**Status: G1 passed, 31 Oct 2026.** Every automatic check passes, and the hand check found 0 wrong labels out of 30. The PM records the decision in a decision record.

> **Updated 1 Nov 2026.** Run 1 used as-of = *actual* close − 7 days, which leaked the outcome ([evaluation.md](evaluation.md#the-leak-found-after-the-test-run)). The numbers below are from the rebuilt dataset, with as-of = **scheduled end** − 7 days. G1 still passes on every criterion, and the labels (and so the hand check) are unchanged.

All numbers come from `ml/reports/funnel.json` and `ml/reports/baselines.json`. To reproduce them, follow `ml/README.md`.

## What was collected

- **Markets:** for every month from Jul 2025 to Oct 2026, the 200 highest-volume closed markets with at least $5,000 of volume (Gamma `/markets`, `closed=true`, ordered by `volumeNum`).
- **Prices:** for each candidate, the hourly YES price over the 14 days that end at its as-of time, from CLOB `/prices-history` with `startTs`/`endTs`. CLOB allows at most 14 days per request, and that is exactly the look-back the features need. Because nothing after as-of was downloaded, no feature can leak the future.
- **As-of time:** scheduled end (`endDate`) − 7 days. Markets that had already closed by then (Gamma `closedTime`) are dropped, because they weren't open to forecast.
- **Downloads:** 3,171 markets and 1,381 price windows. 4 requests failed after retries, because of this network's dropped connections.

Why not "newest closed markets first": that query returned 2,100 markets that all closed in the previous 24 hours, mostly small sports games. That is useless for a time-based split.

## The funnel

| Step | Markets |
|---|---|
| Closed markets downloaded (volume ≥ $5,000) | 3,171 |
| Outcomes exactly Yes / No | 1,767 |
| Clean label (final YES price ≥ 0.99 or ≤ 0.01) | 1,766 |
| Still open at as-of (didn't close before scheduled end − 7 days) | 1,381 |
| Scheduled to run at least 14 days | 834 |
| Crowd price within 24 h before as-of | **830** |

Almost all of the drop at step 2 is multi-outcome markets (team vs team, ranges). Only one yes/no market had an ambiguous final price.

## G1 questions

| Question | Result | Threshold | Pass |
|---|---|---|---|
| How many usable markets? | 830 | ≥ 300 | ✅ |
| Are the labels right? | 30 random markets checked by hand against Polymarket: **0 wrong** (`ml/reports/label-check.csv`) | ≤ 1 wrong | ✅ |
| Do we have a price at the as-of time? | 99.5% of usable markets (830 of 834) | ≥ 80% | ✅ |
| Is there enough time range? | Scheduled ends from Jul 2025 to Oct 2026; the newest 15% of groups hold 117 markets | test set ≥ 60 | ✅ |
| Are related markets grouped? | 378 event groups, the largest has 32 markets; a group never spans two splits | groups exist | ✅ |
| Category mix | World 224 · Sports 155 · Crypto 149 · Economy 126 · Politics 97 · Culture 53 · Tech & Science 25 · Other 1 | report only | — |

Other facts that matter for the model and for Practice mode:

- **Only 21.4% resolved YES.** Practice files must be balanced by hand, or "always say NO" scores well.
- **The crowd is strong 7 days out:** its Brier score at as-of is 0.089 over all 830 markets. Many markets are already near 0 or 1 a week before they close.
- **World and Sports make up 46% of the data.** Tech & Science has only 25 markets, so per-category results there will be noisy.

## How the hand check works

Open `ml/reports/label-check.csv`. For each row, open the Polymarket link, check that the market resolved the way `our_label` says, and write `y` or `n` in the `correct (y/n)` column. G1 passes with at most 1 `n`. If there are 2 or more, look at what went wrong (most likely a market that resolved early or was disputed) before deciding.

## Baselines (ML-04, validation split)

Split by scheduled end over event groups: train 634 markets (264 groups), validation 79 (57 groups), test 117 (57 groups).

| Baseline | Brier | Log loss | ECE |
|---|---|---|---|
| B0 · always 50% | 0.250 | 0.693 | 0.032 |
| B1 · crowd at as-of | **0.196** | 0.573 | 0.087 |
| B2 · category base rate | 0.298 | 0.797 | 0.238 |

- Crowd minus coin flip: −0.054, 95% interval [−0.095, −0.009]. The crowd is clearly better.
- Crowd minus category rate: −0.102, 95% interval [−0.165, −0.036]. Question type alone carries almost no signal.
- The validation period is harder than the dataset as a whole: 0.196 here, against 0.089 overall. G2 compares the model with the crowd on the same test markets, so that is fair, but the absolute numbers will vary between periods.

## Recommendation

**G1: passed** (all automatic checks, and 30 of 30 labels correct). Move on to features and the model (ML-05, ML-06). Given how strong the crowd is, the realistic goal for G2 is the master plan's Level A wording: "a calibrated adjustment of the crowd, not better than it".
