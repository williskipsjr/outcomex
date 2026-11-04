"""Crowd calibration analysis (ML-08): when the crowd says 70%, how often is it YES?

    python -m src.calibration

Writes reports/crowd-calibration.json and reports/figures/crowd-calibration.png.

Uses all usable markets, a week before their scheduled end. It describes the
data and trains nothing, so it doesn't use up the test split. The interval for
each bucket shows how much of a gap could be chance with that few markets.
"""

import json
import math
import sys

import pandas as pd

from . import config
from .evaluate import brier, calibration, expected_calibration_error

Z_95 = 1.96


def wilson_interval(yes, n):
    """95% interval for a share. Behaves sensibly at 0% and 100%, where the
    simple formula would claim there is no uncertainty at all."""
    if n == 0:
        return None
    share = yes / n
    denominator = 1 + Z_95**2 / n
    centre = (share + Z_95**2 / (2 * n)) / denominator
    margin = Z_95 * math.sqrt(share * (1 - share) / n + Z_95**2 / (4 * n**2)) / denominator
    return [max(0.0, centre - margin), min(1.0, centre + margin)]


def analyse(table):
    rows = []
    for row in calibration(table["crowd"], table["y"]):
        if not row["count"]:
            rows.append({**row, "yes_rate_ci95": None, "forecast_inside_interval": None})
            continue
        interval = wilson_interval(round(row["yes_rate"] * row["count"]), row["count"])
        inside = interval[0] <= row["mean_forecast"] <= interval[1]
        rows.append({**row, "yes_rate_ci95": interval, "forecast_inside_interval": inside})
    return rows


def plot(rows, n, path):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    filled = [row for row in rows if row["count"]]
    xs = [row["mean_forecast"] for row in filled]
    ys = [row["yes_rate"] for row in filled]
    lower = [row["yes_rate"] - row["yes_rate_ci95"][0] for row in filled]
    upper = [row["yes_rate_ci95"][1] - row["yes_rate"] for row in filled]

    fig, ax = plt.subplots(figsize=(4.6, 4.6), dpi=150)
    ax.plot([0, 1], [0, 1], color="#9ca3af", linewidth=1, linestyle="--", label="perfect")
    ax.errorbar(xs, ys, yerr=[lower, upper], color="#1d4ed8", marker="o", linewidth=1.4, capsize=3, label="crowd, with 95% interval")
    ax.set_xlabel("crowd price a week before the scheduled end")
    ax.set_ylabel("share that resolved YES")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title(f"Crowd calibration on {n} resolved markets", fontsize=10)
    ax.legend(frameon=False, fontsize=8)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def main():
    table = pd.read_csv(config.INTERIM_DIR / "features.csv")
    rows = analyse(table)
    outside = [row for row in rows if row["count"] and not row["forecast_inside_interval"]]
    by_category = {
        name: {"n": int(len(group)), "crowd_brier": round(brier(group["crowd"], group["y"]), 4), "yes_rate": round(float(group["y"].mean()), 3)}
        for name, group in table.groupby("category")
    }
    report = {
        "n": int(len(table)),
        "yes_rate": round(float(table["y"].mean()), 3),
        "crowd_brier": round(brier(table["crowd"], table["y"]), 4),
        "ece": round(expected_calibration_error(table["crowd"], table["y"]), 4),
        "buckets": rows,
        "buckets_outside_their_interval": [[row["from"], row["to"]] for row in outside],
        "by_category": by_category,
    }
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / "crowd-calibration.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    plot(rows, len(table), config.REPORTS_DIR / "figures" / "crowd-calibration.png")

    print(f"{report['n']} markets, YES rate {report['yes_rate']}, crowd Brier {report['crowd_brier']}, ECE {report['ece']}")
    for row in rows:
        if row["count"]:
            low, high = row["yes_rate_ci95"]
            flag = "" if row["forecast_inside_interval"] else "  <- outside"
            print(f"{row['from']:.1f}-{row['to']:.1f}  n={row['count']:<4} crowd {row['mean_forecast']:.3f}  YES {row['yes_rate']:.3f}  [{low:.3f}, {high:.3f}]{flag}")
    print({name: value["crowd_brier"] for name, value in by_category.items()})


if __name__ == "__main__":
    sys.exit(main())
