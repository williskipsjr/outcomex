# G2 run 1: invalid

These reports come from the first pipeline run (30–31 Oct 2026). In that run, the as-of time was
"*actual* close − 7 days". That leaked the outcome: YES markets often close early, so their as-of
prices were taken before the event, while NO markets' prices had already sunk.

The G2 result in `evaluation.json` is therefore **not valid**. It is kept only as a record of what
happened. The full explanation is in [docs/ml/evaluation.md](../../../docs/ml/evaluation.md).

Practice files v0 (`practice.json`, `practice-review.csv`) were built on the same as-of time and are
replaced by v1.
