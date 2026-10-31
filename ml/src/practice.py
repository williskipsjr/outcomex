"""Step 6 (ML-02): the two Practice-mode files the app reads.

    python -m src.practice              # writes output/ and reports/practice.json
    python -m src.practice --mocks      # also refreshes client/src/mocks (mock mode)
    python -m src.practice --install    # also copies into client/public/data (the app)

Only ship --install together with the frontend's practice swap: today's
sample code in the app still reads the old practice-answers.json shape.

Rules (ML role guide §7):
  - Questions come from the TEST split only, so the AI numbers added after
    gate G2 are genuinely out-of-sample.
  - Roughly balanced YES / NO. Only ~22% of all markets resolved YES, so
    without balancing "always say NO" would score well.
  - No market the crowd had already settled a week out (price under 5% or
    over 95%): there is nothing to learn from those.
  - At most 2 markets per event, so one World Cup doesn't fill the list.
  - No sensitive topics, and reports/practice-review.csv lists every chosen
    question for a human to read before it ships.
  - The list file never contains an outcome or a price.
"""

import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone

import pandas as pd

from . import config
from .collect import load_raw_markets
from .evaluate import load_markets

CROWD_MIN, CROWD_MAX = 0.05, 0.95
MAX_PER_GROUP = 2
MIN_YES_SHARE, MAX_YES_SHARE = 0.4, 0.6
TARGET_ITEMS = 50  # v0 needs at least 50 questions
DESCRIPTION_MAX_CHARS = 2000

# Questions about deaths, violence or tragedies don't belong in a game
SENSITIVE = re.compile(
    r"\b(death|deaths|die|dies|died|dead|kill|killed|killing|assassinat\w*|shoot\w*|shot|murder\w*|terror\w*|"
    r"suicide|hostage\w*|casualt\w*|bomb\w*|rape|abuse|overdose|cancer|funeral|massacre|genocide)\b",
    re.IGNORECASE,
)

LIST_FIELDS = ["id", "question", "description", "category", "imageUrl", "asOfDate", "closedDate"]


def is_sensitive(question, description=""):
    return bool(SENSITIVE.search(question or "")) or bool(SENSITIVE.search(description or ""))


def candidates(table, descriptions):
    """Test-split markets that make a fair, interesting, appropriate question."""
    pool = table[table["split"] == "test"]
    pool = pool[(pool["crowd_as_of"] >= CROWD_MIN) & (pool["crowd_as_of"] <= CROWD_MAX)]
    keep = [not is_sensitive(row.question, descriptions.get(row.id, "")) for row in pool.itertuples()]
    return pool[keep]


def cap_per_group(pool, limit=MAX_PER_GROUP):
    """At most `limit` per event. YES markets go first because they are scarcer,
    then the most traded, so the cap removes the least useful duplicates."""
    ranked = pool.sort_values(["y", "volume", "id"], ascending=[False, False, True])
    return ranked.groupby("group", sort=False).head(limit)


def spread_categories(rows, count):
    """Pick `count` rows taking categories in turn, so no category dominates."""
    queues = {category: list(group.itertuples()) for category, group in rows.groupby("category", sort=True)}
    picked = []
    while len(picked) < count and any(queues.values()):
        for category in sorted(queues):
            if queues[category] and len(picked) < count:
                picked.append(queues[category].pop(0))
    return pd.DataFrame(picked).drop(columns="Index", errors="ignore") if picked else rows.iloc[0:0]


def select_practice(pool):
    """Every YES market in the pool, plus NO markets up to TARGET_ITEMS, keeping 40-60% YES."""
    pool = cap_per_group(pool)
    yes = pool[pool["y"] == 1].sort_values(["volume", "id"], ascending=[False, True])
    no = pool[pool["y"] == 0].sort_values(["volume", "id"], ascending=[False, True])

    most_no = int(len(yes) * (1 - MIN_YES_SHARE) / MIN_YES_SHARE)  # NO count at 40% YES
    least_no = int(len(yes) * (1 - MAX_YES_SHARE) / MAX_YES_SHARE + 0.999)  # NO count at 60% YES
    wanted_no = min(len(no), most_no, max(least_no, len(yes), TARGET_ITEMS - len(yes)))
    chosen = pd.concat([yes, spread_categories(no, wanted_no)])
    return chosen.sort_values(["close", "id"]).reset_index(drop=True)


def practice_id(market_id):
    return f"pr-{market_id}"


def build_files(chosen, raw_by_id, generated_at):
    items, answers = [], {}
    for row in chosen.itertuples():
        raw = raw_by_id.get(str(row.id), {})
        description = (raw.get("description") or "").strip()[:DESCRIPTION_MAX_CHARS]
        image = raw.get("image") or raw.get("icon") or None
        items.append(
            {
                "id": practice_id(row.id),
                "question": row.question,
                "description": description,
                "category": row.category,
                "imageUrl": image,
                "asOfDate": row.as_of,
                "closedDate": row.close,
            }
        )
        answers[practice_id(row.id)] = {
            "outcome": row.outcome,
            "crowdProbabilityAsOf": round(float(row.crowd_as_of), 4),
            "aiProbability": None,  # filled in after gate G2, from a model that never saw the test split
            "modelVersion": None,
            "resolvedAt": row.close,
        }
    practice_list = {"generatedAt": generated_at, "asOfOffsetDays": config.AS_OF_DAYS, "items": items}
    practice_answers = {"generatedAt": generated_at, "answers": answers}
    return practice_list, practice_answers


def check_files(practice_list, practice_answers):
    """The rules the app relies on. Raises if any is broken."""
    ids = [item["id"] for item in practice_list["items"]]
    assert len(ids) == len(set(ids)), "duplicate practice ids"
    assert set(ids) == set(practice_answers["answers"]), "list and answers have different ids"
    for item in practice_list["items"]:
        assert list(item) == LIST_FIELDS, f"unexpected fields in the list: {list(item)}"
        assert re.fullmatch(r"pr-\d+", item["id"]), item["id"]
    for answer in practice_answers["answers"].values():
        assert answer["outcome"] in ("YES", "NO")
        assert 0 <= answer["crowdProbabilityAsOf"] <= 1


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mocks", action="store_true", help="also refresh the mock-mode fixtures in client/src/mocks")
    parser.add_argument("--install", action="store_true", help="also copy into client/public/data")
    args = parser.parse_args(argv)

    table = load_markets()
    raw_by_id = {str(raw["id"]): raw for raw in load_raw_markets()}
    descriptions = {int(k): (v.get("description") or "") for k, v in raw_by_id.items()}
    pool = candidates(table, descriptions)
    chosen = select_practice(pool)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    practice_list, practice_answers = build_files(chosen, raw_by_id, generated_at)
    check_files(practice_list, practice_answers)

    write_json(config.OUTPUT_DIR / "practice-list.json", practice_list)
    write_json(config.OUTPUT_DIR / "practice-answers.json", practice_answers)

    review = chosen[["id", "question", "category", "group", "outcome", "crowd_as_of", "close"]].copy()
    review["practice_id"] = review["id"].map(practice_id)
    review["ok_to_ship (y/n)"] = ""
    review.to_csv(config.REPORTS_DIR / "practice-review.csv", index=False)

    summary = {
        "generatedAt": generated_at,
        "items": len(chosen),
        "yes": int(chosen["y"].sum()),
        "yes_share": round(float(chosen["y"].mean()), 3),
        "categories": chosen["category"].value_counts().to_dict(),
        "events": int(chosen["group"].nunique()),
        "test_split_markets": int((table["split"] == "test").sum()),
        "candidates_after_filters": len(pool),
        "rules": {
            "split": "test only",
            "crowd_as_of_range": [CROWD_MIN, CROWD_MAX],
            "max_per_event": MAX_PER_GROUP,
            "yes_share_range": [MIN_YES_SHARE, MAX_YES_SHARE],
        },
    }
    write_json(config.REPORTS_DIR / "practice.json", summary)

    for target, flag in [(config.REPO_DIR / "client" / "src" / "mocks", args.mocks), (config.APP_DATA_DIR, args.install)]:
        if flag:
            for name in ["practice-list.json", "practice-answers.json"]:
                shutil.copyfile(config.OUTPUT_DIR / name, target / name)
            print("copied into", target.relative_to(config.REPO_DIR))

    print(json.dumps({k: summary[k] for k in ["items", "yes", "yes_share", "events", "categories", "candidates_after_filters"]}, indent=1))
    print("review the questions in", (config.REPORTS_DIR / "practice-review.csv").relative_to(config.ML_DIR))


if __name__ == "__main__":
    sys.exit(main())
