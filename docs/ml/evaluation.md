# ML evaluation and gate G2 (ML-06)

**Status: G2 decided, 31 Oct 2026: Level A, by a narrow margin.** The model is within 0.01 of the crowd on the test split but not better than it. The PM records the decision in a decision record.

Numbers come from `ml/reports/validation.json` and `ml/reports/evaluation.json`. To reproduce them, follow `ml/README.md`.

## Setup

- **Data:** 1,218 resolved yes/no markets that passed G1 ([feasibility.md](feasibility.md)).
- **Split:** by time over event groups. A group never spans two splits.

  | Split | Markets | Event groups |
  |---|---|---|
  | Train | 880 | 330 |
  | Validation | 124 | 71 |
  | Test (newest) | 214 | 71 |

- **Features**, all at the as-of time (close − 7 days):
  - the crowd price as log-odds
  - the 1-day and 7-day price move
  - 14-day volatility and range
  - hours since the last trade
  - category

  Total volume and "days until the scheduled end" are excluded because both carry information from after the as-of time.

## Candidates, simplest first

| Model | What it is |
|---|---|
| `lr_crowd` | Logistic regression on the crowd's log-odds only: a recalibrated crowd |
| `lr_price` | `lr_crowd` plus the price features |
| `lr_full` | `lr_price` plus category |
| `hgb` | Gradient boosting on everything, isotonic-calibrated within train |

Regularisation (C) is tuned by 5-fold cross-validation inside train, with folds grouped by event. Every candidate is then fitted on all of train and scored on validation.

**The pre-set choice rule:** take the model with the lowest validation Brier, then step back to the simplest model that is not significantly worse than it (its bootstrap 95% interval for the difference contains 0).

## Validation results (124 markets)

| | Brier | Log loss | ECE | Minus crowd (95% interval) |
|---|---|---|---|---|
| Crowd (B1 baseline) | 0.1753 | 0.511 | 0.074 | — |
| `lr_crowd` (C = 0.3) | 0.1765 | 0.521 | 0.084 | +0.001 [−0.018, +0.020] |
| `lr_price` (C = 0.3) | 0.1732 | 0.507 | 0.077 | −0.002 [−0.019, +0.014] |
| **`lr_full`** (C = 1.0) | **0.1629** | **0.476** | **0.058** | −0.012 [−0.029, +0.004] |
| `hgb` | 0.1778 | 0.525 | 0.135 | +0.003 [−0.020, +0.024] |

- **`lr_full` is best on every metric.** It is also best in the cross-validation inside train (0.0639 against 0.0646 for `lr_crowd`), though only by a little.
- **The rule chooses `lr_crowd`**, because `lr_full`'s lead over it on validation, −0.014 with a 95% interval of [−0.031, +0.004], is not statistically clear on 124 markets.
- **What `lr_full` learned on train:** after the crowd price, the strongest signal is **Sports, −1.21** on the log-odds scale. Sports markets resolved YES less often than their prices suggested, which is the favourite–longshot bias in championship ladders. Culture shows the same (−0.93); Politics (+0.58) and Economy (+0.46) lean the other way.
- **Caveat:** 96 of the 124 validation markets are Sports, so the validation gain mostly measures that one effect.
- **Gradient boosting** is worse than the plain logistic models and badly calibrated (ECE 0.135), so it is out.

## Decision before the test run

The rule chose `lr_crowd`. **The project owner overrode it to `lr_full` before the test split was touched** (commit `ad2975f`). The reason, as stored in `ml/reports/validation.json`:

> lr_full is best on every validation metric (Brier 0.163 vs crowd 0.175) and in grouped cross-validation inside train; its lead over lr_crowd is not significant on 124 mostly-Sports markets, but it learned an interpretable effect (Sports longshots overpriced) that makes the AI number informative.

`lr_full` (C = 1.0) was then refitted on train + validation (1,004 markets) and scored once on the test split.

## Test results (214 markets, run once)

| | Brier | Log loss | ECE |
|---|---|---|---|
| Always 50% | 0.250 | 0.693 | 0.336 |
| **Crowd at as-of** | **0.0578** | **0.180** | **0.053** |
| `lr_full` | 0.0673 | 0.231 | 0.076 |

- **Model minus crowd:** +0.0095, 95% interval [−0.0007, +0.0209]. The model is slightly worse than the crowd. The difference is not statistically significant, but it leans worse.
- **The test period was easy for the crowd:** Brier 0.058 here, against 0.175 on validation. 144 of the 214 test markets were priced under 10% a week out and nearly all resolved NO.

Per category (Brier, model vs crowd):

| Category | n | Model | Crowd |
|---|---|---|---|
| Sports | 86 | 0.0655 | 0.0652 |
| World | 70 | 0.0665 | 0.0582 |
| Economy | 38 | 0.0566 | 0.0281 |
| Politics | 11 | 0.1132 | 0.0978 |
| Crypto | 7 | 0.1036 | 0.0773 |
| Tech & Science | 2 | 0.0004 | 0.0001 |

The Sports adjustment that helped on validation broke even on test. The model lost most ground on Economy and World.

## Gate G2

| Criterion (master plan §9.2) | Result | Pass |
|---|---|---|
| Leak-free, time-based test set | As-of features only; event groups never span splits; test used once | ✅ |
| Model Brier below always-50% (0.25) | 0.0673 | ✅ |
| No more than 0.01 worse than the crowd | +0.0095 | ✅ (by 0.0005) |
| Calibrated within ±0.10 in buckets with at least 20 markets | Only one bucket has 20+ markets (0–10%, n = 144): forecast 0.021, actual 0.007 | ✅, but on one bucket only |

**Decision: Level A.** The app shows the AI probability with its track record.

How to read this honestly:

- It passes, but narrowly, and the calibration check only had one well-filled bucket. In the 90–100% bucket (18 markets) the model said 97% while 72% resolved YES. That bucket is too small for the rule, but worth knowing.
- **This is not a model that beats the crowd.** It follows the role guide's second row: "a calibrated adjustment of the crowd. It does not beat the crowd; here is its track record."

## What we claim, and what we don't

For the About page and the demo:

> On 214 held-out markets that closed between Apr and Oct 2026, our AI scored a Brier score of 0.067; the crowd scored 0.058 and always saying 50% scores 0.25. The AI starts from the crowd's price and adjusts it for the kind of question and how the price has been moving. It is about as accurate as the crowd, not better.

We never call it a prediction of the future, and never call it financial advice.

## Next

- **ML-07 `predictions.json`:** use exactly the evaluated model (`lr_full`, trained on train + validation), so the number on screen matches the published track record.
- **Practice files:** add the model's out-of-sample AI numbers to `practice-answers.json` for the test-split questions.
- **ML-08:** model card, built from this report.
