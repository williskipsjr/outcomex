# 001 · Gate G1 (data): passed

**Decided:** 31 Oct 2026 by the ML engineer · **Recorded:** 5 Nov 2026 by the PM · **Status:** accepted

## Context

The master plan only lets the AI number appear if it earns it. The first of two evidence gates, G1, asks whether there is enough clean data to train and test a model at all:

- at least 300 clean, resolved yes/no Polymarket markets with a price 7 days before close, and
- 30 random labels checked by hand, with at most 1 error.

If G1 failed, the product would ship at Level C: no AI number, and the ML work would move to practice data and crowd-calibration analysis.

## Decision

**G1 passed.** The feasibility report ([ml/feasibility.md](../ml/feasibility.md)) found **830 usable markets** (300 needed), and the hand check found **0 wrong labels out of 30**.

On 1 Nov the dataset was rebuilt with the as-of time set to the **scheduled end − 7 days**, after the first model test showed that using the actual close time leaked the outcome (see [decision 002](002-ai-level-g2.md)). G1 still passes on every criterion, and the labels, and so the hand check, are unchanged.

## Alternatives

- **Level C, no model:** the planned fallback if G1 failed. Not needed, because the data was there.

## Consequences

- The ML work went on to the model gate, G2.
- Practice mode uses resolved markets from this dataset, shown as they looked 7 days before their scheduled end.
