# ML evaluation and gate G2 (ML-06)

**Status: validation done. The one-time test evaluation has not been run yet.**

Numbers come from `ml/reports/validation.json` (and, once the test run happens, `ml/reports/evaluation.json`). To reproduce them, follow `ml/README.md`.

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

⏳ **Choose which model goes to the test split, and record it before running it:**

- **Keep the rule:** `python -m src.train --test` evaluates `lr_crowd`. That almost certainly gives Level A, but the AI number will sit very close to the crowd's.
- **Override to `lr_full`:**

  ```bash
  python -m src.train --choose lr_full --reason "..."
  python -m src.train --test
  ```

  The reason is stored next to the choice in `ml/reports/validation.json` and in the test report.

The test split is evaluated exactly once. `--test` refuses to run again once `ml/reports/evaluation.json` exists.

## Test results and the G2 decision

*Pending the one-time test run.*
