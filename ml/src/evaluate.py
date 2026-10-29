"""The split and the metrics every report uses, so baselines and models are
measured in exactly the same way."""

import numpy as np
import pandas as pd

from . import config

EPS = 1e-6


def time_group_split(table, train=0.70, validation=0.15):
    """Split by time over groups (ML role guide §6).

    Groups (Polymarket events) are ordered by the close date of their last
    market. The oldest ~70% of groups train, the next ~15% validate and the
    newest ~15% test. A group never spans two splits, so a "by June / July /
    August" ladder can't leak between train and test.
    """
    last_close = table.groupby("group")["close"].max().sort_values(kind="stable")
    groups = list(last_close.index)
    cut_train = int(len(groups) * train)
    cut_validation = int(len(groups) * (train + validation))
    split_of = {}
    for index, group in enumerate(groups):
        split_of[group] = "train" if index < cut_train else "validation" if index < cut_validation else "test"
    return table["group"].map(split_of)


def brier(p, y):
    return float(np.mean((np.asarray(p) - np.asarray(y)) ** 2))


def log_loss(p, y):
    p = np.clip(np.asarray(p, dtype=float), EPS, 1 - EPS)
    y = np.asarray(y, dtype=float)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def calibration(p, y, buckets=10):
    """Per bucket: count, mean forecast, YES rate. Same buckets as the app."""
    p = np.asarray(p, dtype=float)
    y = np.asarray(y, dtype=float)
    index = np.minimum((p * buckets).astype(int), buckets - 1)
    rows = []
    for bucket in range(buckets):
        mask = index == bucket
        count = int(mask.sum())
        rows.append(
            {
                "from": bucket / buckets,
                "to": (bucket + 1) / buckets,
                "count": count,
                "mean_forecast": float(p[mask].mean()) if count else None,
                "yes_rate": float(y[mask].mean()) if count else None,
            }
        )
    return rows


def expected_calibration_error(p, y, buckets=10):
    rows = calibration(p, y, buckets)
    total = sum(row["count"] for row in rows)
    return float(sum(row["count"] / total * abs(row["mean_forecast"] - row["yes_rate"]) for row in rows if row["count"]))


def metrics(p, y):
    return {
        "n": int(len(y)),
        "brier": round(brier(p, y), 4),
        "log_loss": round(log_loss(p, y), 4),
        "ece": round(expected_calibration_error(p, y), 4),
    }


def bootstrap_difference(p_a, p_b, y, rounds=2000, seed=config.SEED):
    """95% interval for Brier(a) - Brier(b). If it contains 0: no difference."""
    rng = np.random.default_rng(seed)
    p_a, p_b, y = (np.asarray(v, dtype=float) for v in (p_a, p_b, y))
    n = len(y)
    diffs = np.empty(rounds)
    for r in range(rounds):
        idx = rng.integers(0, n, n)
        diffs[r] = np.mean((p_a[idx] - y[idx]) ** 2) - np.mean((p_b[idx] - y[idx]) ** 2)
    low, high = np.percentile(diffs, [2.5, 97.5])
    point = brier(p_a, y) - brier(p_b, y)
    return {"difference": round(point, 4), "ci95": [round(float(low), 4), round(float(high), 4)], "no_difference": bool(low <= 0 <= high)}


def load_markets():
    table = pd.read_csv(config.INTERIM_DIR / "markets.csv")
    table["split"] = time_group_split(table)
    return table
