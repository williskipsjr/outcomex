# ML feasibility report and gate G1 (ML-01)

**Status: draft, 30 Oct 2026.** Every automatic G1 check passes. The decision waits on one manual step: the 30-label hand check in `ml/reports/label-check.csv`. Due Sun 1 Nov; the PM records the decision.

All numbers come from `ml/reports/funnel.json` and `ml/reports/baselines.json`. To reproduce them, follow `ml/README.md`.

## What was collected

- **Markets:** for every month from Jul 2025 to Oct 2026, the 200 highest-volume closed markets with at least $5,000 of volume (Gamma `/markets`, `closed=true`, ordered by `volumeNum`).
- **Prices:** for each candidate, the hourly YES price over the 14 days that end at its as-of time, from CLOB `/prices-history` with `startTs`/`endTs`. CLOB allows at most 14 days per request, and that is exactly the look-back the features need. Because nothing after as-of was downloaded, no feature can leak the future.
- **As-of time:** close − 7 days. Close is Gamma's `closedTime` (when trading actually stopped), else `endDate`.
- **Downloads:** 3,171 markets and 1,766 price histories, with 0 failed requests.

Why not "newest closed markets first": that query returned 2,100 markets that all closed in the previous 24 hours, mostly small sports games. That is useless for a time-based split.

## The funnel

| Step | Markets |
|---|---|
| Closed markets downloaded (volume ≥ $5,000) | 3,171 |
| Outcomes exactly Yes / No | 1,767 |
| Clean label (final YES price ≥ 0.99 or ≤ 0.01) | 1,766 |
| Open for at least 14 days | 1,219 |
| Crowd price within 24 h before as-of | **1,218** |

Almost all of the drop at step 2 is multi-outcome markets (team vs team, ranges). Only one yes/no market had an ambiguous final price.

## G1 questions

| Question | Result | Threshold | Pass |
|---|---|---|---|
| How many usable markets? | 1,218 | ≥ 300 | ✅ |
| Are the labels right? | 30 random markets in `ml/reports/label-check.csv` | ≤ 1 wrong | ⏳ hand check pending |
| Do we have a price at the as-of time? | 99.9% of usable markets (1,218 of 1,219) | ≥ 80% | ✅ |
| Is there enough time range? | Closes from Feb 2025 to Oct 2026; the newest 15% of groups hold 214 markets | test set ≥ 60 | ✅ |
| Are related markets grouped? | 472 event groups, the largest has 49 markets; a group never spans two splits | groups exist | ✅ |
| Category mix | Sports 362 · World 304 · Crypto 159 · Economy 139 · Politics 137 · Culture 79 · Tech & Science 37 · Other 1 | report only | — |

Other facts that matter for the model and for Practice mode:

- **Only 21.8% resolved YES.** Practice files must be balanced by hand, or "always say NO" scores well.
- **The crowd is strong 7 days out:** its Brier score at as-of is 0.077 over all 1,218 markets. Many markets are already near 0 or 1 a week before they close.
- **Sports and World make up 55% of the data.** Tech & Science has only 37 markets, so per-category results there will be noisy.

## How the hand check works

Open `ml/reports/label-check.csv`. For each row, open the Polymarket link, check that the market resolved the way `our_label` says, and write `y` or `n` in the `correct (y/n)` column. G1 passes with at most 1 `n`. If there are 2 or more, look at what went wrong (most likely a market that resolved early or was disputed) before deciding.

## Baselines (ML-04, validation split)

Split by time over event groups: train 880 markets (330 groups), validation 124 (71 groups), test 214 (71 groups). The test split is untouched until G2.

| Baseline | Brier | Log loss | ECE |
|---|---|---|---|
| B0 · always 50% | 0.250 | 0.693 | 0.073 |
| B1 · crowd at as-of | **0.175** | 0.511 | 0.074 |
| B2 · category base rate | 0.321 | 0.917 | 0.259 |

- Crowd minus coin flip: −0.075, 95% interval [−0.110, −0.038]. The crowd is clearly better.
- Crowd minus category rate: −0.146, 95% interval [−0.211, −0.079]. Question type alone carries almost no signal.
- The validation period is harder than the dataset as a whole: 0.175 here, against 0.077 overall. G2 compares the model with the crowd on the same test markets, so that is fair, but the absolute numbers will vary between periods.

## Recommendation

**G1: pass, once the hand check shows at most 1 wrong label.** Move on to features and the model (ML-05, ML-06). Given how strong the crowd is, the realistic goal for G2 is the master plan's Level A wording: "a calibrated adjustment of the crowd, not better than it".
