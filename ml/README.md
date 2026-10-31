# OutcomeX ML pipeline

The AI layer runs offline, on a laptop. It reads resolved Polymarket markets, measures honestly whether a model can match the crowd, and writes static JSON files that the app reads from `client/public/data/`. The app never calls Python: if this pipeline produces nothing, the app shows "AI not available" and still works.

The one rule: **an AI number appears in the app only if it has a published, leak-free track record** (gates G1 and G2, master plan §9.2).

## Setup

You need Python 3.11 or newer.

```bash
cd ml
python -m venv .venv
.venv/Scripts/activate      # Windows; on macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

## Steps

Run everything from `ml/`. Each step is a script; notebooks are only for exploring.

| Step | Command | Writes | Status |
|---|---|---|---|
| 1a. Collect markets | `python -m src.collect markets` | `data/raw/markets/` (the 200 highest-volume closed markets of each month since Jul 2025) | Done |
| 1b. Collect prices | `python -m src.collect histories` | `data/raw/history/` (14 days of hourly YES prices ending at each as-of time) | Done |
| 2. Clean + G1 numbers | `python -m src.clean` | `data/interim/markets.csv`, `reports/funnel.json`, `reports/label-check.csv` | Done |
| 3. Baselines | `python -m src.baselines` | `reports/baselines.json` | Done (ML-04) |
| 4. Features | `python -m src.features` | `data/interim/features.csv` | ML-05 |
| 5. Train + evaluate (G2) | `python -m src.train` | `reports/evaluation.json`, figures | ML-06 |
| 6. Practice files | `python -m src.practice` | `output/practice-*.json` | ML-02 |
| 7. Predictions | `python -m src.predict` | `output/predictions.json` | ML-07 |

`data/` is git-ignored and never committed. Both collect steps skip files that are already on disk, so a run that was interrupted (or rate-limited) just continues where it stopped. Collecting from scratch takes about 10 minutes, because the scripts pause between requests to be polite to a free API.

Tests: `python -m unittest discover -s tests`

## The choices that matter

| Choice | Value | Why |
|---|---|---|
| As-of time | close − 7 days | Practice mode "travels back" to this moment, and every feature is computed at it |
| Close time | Gamma `closedTime`, else `endDate` | When trading actually stopped; many markets resolve early |
| Label | YES if the final YES price ≥ 0.99, NO if ≤ 0.01, otherwise dropped | Ambiguous and 50/50 resolutions can't be scored |
| Minimum volume | $5,000 | Thin markets are noise |
| Minimum lifetime | 14 days | The market must exist well before its as-of time |
| Price history window | the 14 days ending at as-of | CLOB allows at most 14 days per request, and we never download a price from after as-of, so features cannot leak the future |
| Groups | Polymarket event slug | All markets of one event ("by June / July / August") go to the same split |
| Split | by time over groups: oldest ~70% train, next ~15% validation, newest ~15% test | The test set is used once, at G2 |
| Categories | `src/polymarket.py`, identical to `client/src/data/normalize.js` | Checked by shared test cases in `client/src/data/__fixtures__/category-cases.json` |

## Scoring

Identical to the app (`client/src/lib/scoring.js`):

- Brier score for one forecast: (p − o)², where o = 1 if YES happened. 0 is perfect, 0.25 is always saying 50%.
- Accuracy for display: round(100 × (1 − Brier)), always shown next to the Brier score.
- The crowd's price at the as-of time is the real baseline to beat.

## Ethics and limits

- No personal data is collected. Questions about private individuals or tragedies are excluded from the practice files.
- The model is never described as financial advice or as "predicting the future". It estimates probabilities and has a measured track record.
