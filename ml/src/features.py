"""Step 4 (ML-05): one row of features per market, all known at the as-of time.

    python -m src.features

Writes data/interim/features.csv and reports/features.json.

Every feature is computed by `features_at(points, as_of)`, which first drops
any price after as-of. The price windows were only ever downloaded up to
as-of (collect.py), so this is a second lock on the same door, and the test
suite checks it.

Deliberately NOT used:
  - total volume: Gamma's number includes trading after as-of
  - days until the scheduled end: as-of is always scheduled end - 7 days, so
    it would be the same for every market (and when as-of was anchored on the
    actual close, it leaked the outcome; see docs/ml/evaluation.md)
  - anything from the question text or description (kept for later, if ever)
"""

import json
import math
import sys

import numpy as np
import pandas as pd

from . import config
from .evaluate import load_markets

DAY = 86400
CLIP = 0.01

FEATURES = ["crowd", "crowd_logit", "move_1d", "move_7d", "volatility_14d", "range_14d", "hours_since_trade"]


def logit(p):
    p = min(max(p, CLIP), 1 - CLIP)
    return math.log(p / (1 - p))


def price_at(points, moment):
    """Last price at or before `moment`, or None. points: sorted [(t, p)]."""
    best = None
    for t, p in points:
        if t > moment:
            break
        best = p
    return best


def features_at(points, as_of):
    """points: [{"t": unix seconds, "p": price}] in any order. as_of: unix seconds.

    Only points at or before as-of are ever looked at.
    """
    known = sorted((int(pt["t"]), float(pt["p"])) for pt in points if pt.get("t") is not None and int(pt["t"]) <= as_of)
    if not known:
        return None

    now = known[-1][1]
    first = known[0][1]

    def move(days):
        # If the window doesn't reach back that far, compare with its first price
        before = price_at(known, as_of - days * DAY)
        return now - (before if before is not None else first)

    # Daily closing prices over the 14-day window, then the spread of their changes
    daily = []
    for day in range(config.HISTORY_WINDOW_DAYS, -1, -1):
        price = price_at(known, as_of - day * DAY)
        if price is not None:
            daily.append(price)
    changes = np.diff(daily) if len(daily) > 1 else np.array([0.0])
    window = [p for t, p in known if t >= as_of - config.HISTORY_WINDOW_DAYS * DAY]

    return {
        "crowd": now,
        "crowd_logit": logit(now),
        "move_1d": move(1),
        "move_7d": move(7),
        "volatility_14d": float(np.std(changes)),
        "range_14d": (max(window) - min(window)) if window else 0.0,
        "hours_since_trade": (as_of - known[-1][0]) / 3600,
    }


def build(table):
    rows, missing = [], 0
    for row in table.itertuples():
        path = config.RAW_HISTORY_DIR / f"{row.id}.json"
        body = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"history": []}
        as_of = int(pd.Timestamp(row.as_of).timestamp())
        values = features_at(body.get("history", []), as_of)
        if values is None:
            missing += 1
            continue
        rows.append({"id": row.id, **values})
    return pd.DataFrame(rows), missing


def main():
    table = load_markets()
    features, missing = build(table)
    keep = ["id", "group", "category", "close", "as_of", "split", "y", "outcome", "crowd_as_of"]
    merged = table[keep].merge(features, on="id", how="inner")

    # crowd here is recomputed from the same window; it must equal clean.py's price
    mismatch = int((merged["crowd"] - merged["crowd_as_of"]).abs().gt(1e-9).sum())

    config.INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    merged.to_csv(config.INTERIM_DIR / "features.csv", index=False)

    train = merged[merged["split"] == "train"]
    summary = {
        "rows": len(merged),
        "missing_history": missing,
        "crowd_mismatch_with_clean_step": mismatch,
        "features": FEATURES + ["category (one-hot in the model)"],
        "train_describe": train[FEATURES].describe().round(4).to_dict(),
        # A first look on the training split only: does a feature move with the outcome?
        "train_correlation_with_outcome": train[FEATURES + ["y"]].corr()["y"].drop("y").round(3).to_dict(),
    }
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / "features.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"{len(merged)} rows, {missing} without history, {mismatch} crowd mismatches")
    print("train correlation with outcome:", summary["train_correlation_with_outcome"])


if __name__ == "__main__":
    sys.exit(main())
