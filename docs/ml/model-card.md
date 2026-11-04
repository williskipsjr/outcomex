# Model card: OutcomeX AI estimate

**Version:** `lr-crowd-2026-11-01` · **Gate G2:** Level A, by run 2 ([evaluation.md](evaluation.md))

## In one paragraph

The OutcomeX AI is the crowd's price, gently recalibrated. It takes a Polymarket YES price from a market about a week from its scheduled end, and pulls very confident prices slightly toward the middle. On 117 held-out markets it scored the same as the crowd: Brier 0.0891 against 0.0890. **It doesn't beat the crowd, and it knows nothing the crowd doesn't.** It's in the app as a calibrated second opinion, with this track record next to it.

## What it is

| | |
|---|---|
| **Type** | Logistic regression (scikit-learn), C = 0.3 |
| **Input** | One number: the crowd's YES price, as log-odds |
| **Output** | Probability of YES, clipped to 1–99% |
| **Formula** | AI log-odds = 0.12 + 0.86 × crowd log-odds |
| **Runs** | Offline, on a laptop. The app only reads a static file, `predictions.json` |
| **Explanations** | Up to 3 sentences that split the AI-vs-crowd gap exactly, and never contradict the number |

| Crowd | 2% | 10% | 30% | 50% | 70% | 90% | 98% |
|---|---|---|---|---|---|---|---|
| AI | 4% | 15% | 35% | 53% | 70% | 88% | 97% |

## Intended use

- Showing a second number next to You and the Crowd in the reveal, so a learner can compare their forecast with a calibrated version of the crowd.
- Practice mode, where its number on each question comes from a model that never trained on that question.

## What it must not be used for

- **Betting, trading or any financial decision.** It's not financial advice.
- **"Predicting the future."** It estimates a probability and has a measured track record, nothing more.
- **Beating the market.** It has no edge over the crowd, and the test shows that.
- **Markets far from their end date.** It was only tested a week before a market's scheduled end. The app shows a number only when the scheduled end is 1–21 days away; other markets show "AI not available".
- **Questions outside Polymarket's yes/no markets.** It learned from nothing else.

## Data

- **Source:** public Polymarket APIs (Gamma for markets, CLOB for prices). No personal data.
- **Selection:** for each month from Jul 2025 to Oct 2026, the 200 highest-volume closed markets with at least $5,000 of volume.
- **Labels:** YES if the final price was at least 0.99, NO if at most 0.01; anything else dropped. 30 random labels were checked by hand, with 0 wrong.
- **As-of time:** scheduled end − 7 days, known in advance. No price after that time was downloaded.

| Step | Markets |
|---|---|
| Closed markets downloaded | 3,171 |
| Clean yes/no labels | 1,766 |
| Still open at as-of | 1,381 |
| Scheduled to run at least 14 days | 834 |
| **Crowd price within 24 h before as-of** | **830** |

The split is by scheduled end over event groups, so a group never spans two splits: train 634, validation 79, test 117. The final model was refitted on train + validation (713 markets).

## How it was chosen

Four candidates were compared on validation: the crowd's price alone (`lr_crowd`), plus price movement (`lr_price`), plus category (`lr_full`), and gradient boosting (`hgb`). None was significantly different from the crowd. A rule fixed in advance picks the simplest model not significantly worse than the best, which gave `lr_crowd`, with no human override.

## Results

| On 117 held-out markets | Brier | Log loss | ECE |
|---|---|---|---|
| Always 50% | 0.250 | 0.693 | 0.321 |
| Crowd a week before the scheduled end | 0.0890 | 0.272 | 0.077 |
| **AI** | **0.0891** | 0.278 | 0.080 |

Model minus crowd: +0.0001, 95% interval [−0.0042, +0.0038]. No difference.

Per category (AI vs crowd), with few markets in each: Economy 0.030 vs 0.024 (38), World 0.133 vs 0.140 (34), Sports 0.116 vs 0.116 (26), Politics 0.115 vs 0.113 (10), Crypto 0.086 vs 0.081 (7), Tech & Science 0.000 vs 0.000 (2).

## Crowd calibration

When the crowd says 70%, how often is it YES? On all 830 markets, a week before the scheduled end (`ml/reports/crowd-calibration.json`, chart in `ml/reports/figures/crowd-calibration.png`):

| Crowd price | Markets | Average price | Resolved YES | 95% interval |
|---|---|---|---|---|
| 0–10% | 519 | 1.6% | 2.7% | 1.6–4.5% |
| 10–20% | 57 | 15.1% | 24.6% | 15.2–37.1% |
| 20–30% | 38 | 23.9% | 28.9% | 17.0–44.8% |
| 30–40% | 33 | 34.1% | 42.4% | 27.2–59.2% |
| 40–50% | 30 | 46.1% | 33.3% | 19.2–51.2% |
| 50–60% | 36 | 55.7% | 58.3% | 42.2–72.9% |
| 60–70% | 38 | 65.4% | 76.3% | 60.8–87.0% |
| 70–80% | 24 | 75.2% | 62.5% | 42.7–78.8% |
| 80–90% | 21 | 85.5% | 85.7% | 65.4–95.0% |
| 90–100% | 34 | 96.4% | 94.1% | 80.9–98.4% |

**The crowd is well calibrated.** Its Brier score is 0.089 and its calibration error (ECE) is 0.034. The price falls inside the interval in 9 of the 10 ranges, and misses by a hair in the other (10–20%), which is about what chance alone would produce. Longshots may be slightly underpriced, which is the mild adjustment our model makes, but this is weak evidence.

This is why the model can't beat the crowd by much: there's little error for it to correct.

## Known limits

- **Few mid-priced markets.** Most markets are near 0% or 100% a week out. The G2 calibration check needs 20+ markets per range, and only the 0–10% range had that on the test split, so calibration elsewhere is lightly tested.
- **The test markets were seen before.** Run 2 re-used many of the same newest markets as the discarded run 1, with corrected inputs. No choice in run 2 depended on a person, but this is a real weakness, and it's stated in the evaluation.
- **Stale between runs.** `predictions.json` uses the crowd's price on the day it's generated, so the live price can move away from it. The reveal says which day. Numbers need regenerating regularly.
- **1–21 days is wider than what was tested.** It was tested exactly 7 days before the scheduled end. The range around that is a judgement call, not a measured result.
- **Selection.** Picking the highest-volume markets each month uses volume from after the as-of time. That could favour markets that became big news, and it hasn't been measured.
- **Only 39 practice questions.** The plan aimed for 150, but the rules (test split only, crowd price 5–95%, at most 2 per event, 40–60% YES) leave 39. Adding the validation split could raise that, but those markets are in the final model's training data, so their AI numbers wouldn't be out-of-sample.
- **Scheduled end dates.** We trust Gamma's `endDate`. If a market's end date was edited after it resolved, its as-of time could still depend on the outcome. We checked calibration overall, not each market.

## History: why there was a run 1

Run 1 anchored the as-of time on the *actual* close, which is earlier when a market resolves YES early. The outcome leaked in, and the model learned to push mid-priced markets up, on both sides of the same race. It was caught when live predictions looked impossible, and run 1 was thrown out under the master plan's own rule. Its reports are kept in `ml/reports/run1-invalid/`.

## Keeping it current

- **Refresh the numbers:** `cd ml && python -m src.predict --install`, before each demo, and daily once the app is in use. Then run `npm run check:contracts` from `client/`.
- **Retraining** would change the model, so it needs a new evaluation and a new version.
- **Reproducing everything:** see `ml/README.md`.
