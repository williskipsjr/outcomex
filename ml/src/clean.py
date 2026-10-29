"""Step 2: raw downloads -> one clean, labelled table, plus the G1 numbers.

    python -m src.clean

Writes
    data/interim/markets.csv      one row per usable market (git-ignored)
    reports/funnel.json           row counts after every cleaning step (G1 evidence)
    reports/label-check.csv       30 random markets to check by hand against Polymarket

Every rule is from the ML role guide §5–§6. The as-of time is close - 7 days,
and nothing after it is used: the price histories were only downloaded up to
as-of in the first place (see collect.py).
"""

import csv
import json
import random
import sys
from datetime import timedelta

import pandas as pd

from . import config
from .collect import close_time, load_raw_markets
from .polymarket import category_of, event_slug, iso, label, to_utc, yes_index, yes_token_id


def as_of_price(history_file, as_of):
    """Last crowd price at or before as-of, if it is no older than 24 h."""
    if not history_file.exists():
        return None, "no history file"
    body = json.loads(history_file.read_text(encoding="utf-8"))
    points = [p for p in body.get("history", []) if p.get("t") is not None and p["t"] <= as_of.timestamp()]
    if not points:
        return None, body.get("error") or "no price before as-of"
    last = max(points, key=lambda p: p["t"])
    if as_of.timestamp() - last["t"] > config.AS_OF_PRICE_MAX_GAP_HOURS * 3600:
        return None, "last price older than 24 h"
    return float(last["p"]), None


def build():
    rows = load_raw_markets()
    funnel = [("closed markets downloaded (volume >= $%d)" % config.MIN_VOLUME_USD, len(rows))]

    rows = [r for r in rows if yes_index(r) != -1]
    funnel.append(("outcomes exactly Yes / No", len(rows)))

    rows = [r for r in rows if label(r) is not None]
    funnel.append(("clean label (final YES price >= 0.99 or <= 0.01)", len(rows)))

    def lifetime_days(raw):
        start = to_utc(raw.get("startDate")) or to_utc(raw.get("createdAt"))
        end = close_time(raw)
        return (end - start).total_seconds() / 86400 if start and end else -1

    rows = [r for r in rows if lifetime_days(r) >= config.MIN_LIFETIME_DAYS]
    funnel.append((f"open for at least {config.MIN_LIFETIME_DAYS} days", len(rows)))
    usable_before_price = len(rows)

    records, missing_reasons = [], {}
    for raw in rows:
        closed = close_time(raw)
        as_of = closed - timedelta(days=config.AS_OF_DAYS)
        price, problem = as_of_price(config.RAW_HISTORY_DIR / f"{raw['id']}.json", as_of)
        if price is None:
            missing_reasons[problem] = missing_reasons.get(problem, 0) + 1
            continue
        records.append(
            {
                "id": str(raw["id"]),
                "question": raw.get("question", "").strip(),
                "category": category_of(raw.get("tags"), raw.get("question")),
                "group": event_slug(raw),
                "start": iso(to_utc(raw.get("startDate")) or to_utc(raw.get("createdAt"))),
                "close": iso(closed),
                "as_of": iso(as_of),
                "outcome": label(raw),
                "y": 1 if label(raw) == "YES" else 0,
                "crowd_as_of": price,
                "volume": float(raw.get("volumeNum") or 0),
                "image": raw.get("image") or raw.get("icon") or "",
                "slug": raw.get("slug") or "",
                "yes_token": yes_token_id(raw),
            }
        )
    funnel.append(("crowd price within 24 h before as-of", len(records)))

    table = pd.DataFrame(records).sort_values("close").reset_index(drop=True)
    return table, funnel, usable_before_price, missing_reasons


def newest_groups_share(table, share=0.15):
    """How many markets the newest ~15% of groups hold: the future test set."""
    by_group = table.groupby("group")["close"].max().sort_values()
    newest = by_group.index[int(len(by_group) * (1 - share)) :]
    return int(table["group"].isin(newest).sum())


def write_label_sample(table, n=30):
    rng = random.Random(config.SEED)
    sample = table.iloc[rng.sample(range(len(table)), min(n, len(table)))]
    path = config.REPORTS_DIR / "label-check.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["id", "question", "our_label", "close", "polymarket_url", "correct (y/n)", "note"])
        for _, row in sample.iterrows():
            writer.writerow([row["id"], row["question"], row["outcome"], row["close"], f"https://polymarket.com/market/{row['slug']}", "", ""])
    return path


def main():
    table, funnel, usable, missing = build()
    config.INTERIM_DIR.mkdir(parents=True, exist_ok=True)
    table.to_csv(config.INTERIM_DIR / "markets.csv", index=False)

    n = len(table)
    report = {
        "funnel": [{"step": step, "rows": rows} for step, rows in funnel],
        "dropped_for_missing_as_of_price": missing,
        "g1": {
            "usable_markets": n,
            "usable_markets_pass": n >= 300,
            "as_of_price_coverage": round(n / usable, 3) if usable else 0,
            "as_of_price_coverage_pass": usable > 0 and n / usable >= 0.8,
            "markets_in_newest_15pct_of_groups": newest_groups_share(table),
            "test_set_size_pass": newest_groups_share(table) >= 60,
            "groups": int(table["group"].nunique()),
            "largest_group": int(table["group"].value_counts().max()),
            "label_check": "pending: fill in reports/label-check.csv by hand (pass = at most 1 wrong out of 30)",
        },
        "yes_share": round(float(table["y"].mean()), 3),
        "categories": table["category"].value_counts().to_dict(),
        "close_range": [table["close"].min(), table["close"].max()],
        "by_month": table.assign(month=table["close"].str[:7]).groupby("month").size().to_dict(),
        "crowd_brier_at_as_of": round(float(((table["crowd_as_of"] - table["y"]) ** 2).mean()), 4),
        "coin_flip_brier": 0.25,
    }
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / "funnel.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    sample = write_label_sample(table)

    for step, rows in funnel:
        print(f"{rows:>6}  {step}")
    print(json.dumps(report["g1"], indent=2))
    print("YES share", report["yes_share"], "| crowd Brier at as-of", report["crowd_brier_at_as_of"])
    print("label sample ->", sample.relative_to(config.ML_DIR))


if __name__ == "__main__":
    sys.exit(main())
