# 002 · Gate G2 (model) and the AI level: Level A

**Decided:** 1 Nov 2026 by the ML engineer (test run 2) · **Recorded:** 5 Nov 2026 by the PM · **Status:** accepted

## Context

Gate G2 decides what the AI row in the reveal shows. The pass criteria were fixed in the master plan before any test:

- a leak-free, time-based test set;
- a Brier score lower than always saying 50% (0.25), and no more than 0.01 worse than the crowd;
- calibration within ±0.10 in buckets with at least 20 markets.

The three possible levels:

| Level | What the user sees |
|---|---|
| **A** | An AI probability, with its track record |
| **B** | Momentum signals only, no AI probability |
| **C** | "AI not available" everywhere |

## Decision

**Level A: the app shows an AI probability.** The model is **the crowd's price, gently recalibrated** (`lr-crowd-2026-11-01`). On 117 held-out markets, scored a week before their scheduled end, it scored a Brier score of **0.0891 against the crowd's 0.0890**. Always saying 50% scores 0.25.

| Criterion | Result |
|---|---|
| Leak-free, time-based test set | ✅ (run 2) |
| Better than always 50% | ✅ 0.0891 vs 0.25 |
| No more than 0.01 worse than the crowd | ✅ 0.0001 worse |
| Calibrated within ±0.10 in buckets of 20+ | ✅, but only one bucket had 20+ markets |

It passes, but narrowly: **the AI ties the crowd, it doesn't beat it.** Full details are in [ml/evaluation.md](../ml/evaluation.md) and [ml/model-card.md](../ml/model-card.md).

**Run 1 (30–31 Oct) is invalid.** Its as-of time was based on the actual close time, which let the outcome leak in. It was thrown out, and run 2 used a corrected as-of time, with its rules written down before any result was computed.

## Alternatives

- **Level B (signals only):** would have hidden a number that passed its gate.
- **Level C:** only if the test wasn't leak-free or the model wasn't better than 50%; neither applied to run 2.
- **Keeping run 1's result:** rejected, because its as-of time leaked the outcome.

## Consequences

- The reveal shows an AI probability for live markets 1–21 days from their scheduled end, and "AI not available" for the rest.
- What the About page says about the AI: it is **as accurate as the crowd, not more**; it doesn't read the news; it only gives a number for markets ending within 21 days, because it was tested a week before each market's end. The PM and the ML engineer agree every sentence.
- Because prices move, `predictions.json` has to be regenerated for each release.
