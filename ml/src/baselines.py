"""Step 3 (ML-04): the three baselines every model must be compared against.

    python -m src.baselines

    B0 coin flip       always 0.5. Brier 0.25; anything worse is broken.
    B1 crowd           the market price at the as-of time. The real bar.
    B2 category rate   share of YES in that category in the training split.

Reported on the validation split only. The test split is not touched until
gate G2; this script only says how big it is.
"""

import json
import sys

from . import config
from .evaluate import bootstrap_difference, calibration, load_markets, metrics


def main():
    table = load_markets()
    train = table[table["split"] == "train"]
    validation = table[table["split"] == "validation"]

    base_rates = train.groupby("category")["y"].mean()
    overall = float(train["y"].mean())

    y = validation["y"]
    forecasts = {
        "B0_coin_flip": [0.5] * len(validation),
        "B1_crowd": validation["crowd_as_of"].clip(0.01, 0.99),
        "B2_category_base_rate": validation["category"].map(base_rates).fillna(overall),
    }

    report = {
        "split_sizes": {
            name: {"markets": int((table["split"] == name).sum()), "groups": int(table.loc[table["split"] == name, "group"].nunique())}
            for name in ["train", "validation", "test"]
        },
        "split_close_ranges": {
            name: [table.loc[table["split"] == name, "close"].min(), table.loc[table["split"] == name, "close"].max()]
            for name in ["train", "validation", "test"]
        },
        "validation": {name: metrics(p, y) for name, p in forecasts.items()},
        "crowd_vs_coin_flip": bootstrap_difference(forecasts["B1_crowd"], forecasts["B0_coin_flip"], y),
        "crowd_vs_category_rate": bootstrap_difference(forecasts["B1_crowd"], forecasts["B2_category_base_rate"], y),
        "crowd_calibration_validation": calibration(forecasts["B1_crowd"], y),
        "train_category_base_rates": {k: round(float(v), 3) for k, v in base_rates.items()},
    }
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / "baselines.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report["split_sizes"]))
    for name, values in report["validation"].items():
        print(f"{name:<24} {values}")
    print("crowd - coin flip:", report["crowd_vs_coin_flip"])
    print("crowd - category rate:", report["crowd_vs_category_rate"])


if __name__ == "__main__":
    sys.exit(main())
