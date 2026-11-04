"""Step 7 (ML-07): AI probabilities for today's open markets -> predictions.json.

    python -m src.predict              # output/predictions.json and output/model.json
    python -m src.predict --mocks      # also: client/src/mocks/predictions.json for mock mode
    python -m src.predict --install    # also: client/public/data/predictions.json (the app)

Run it again whenever you want fresh numbers (daily during the demo period):
prices move, and a market missing from the file shows "AI not available"
(reason NOT_SCORED) in the app.

Which markets: the same Gamma listing the app's listMarkets reads (open,
busiest in the last 24 h, 5 pages of 100), but every yes/no market in it,
without the app's 3-per-event cap. So the file covers whatever the dashboard
happens to show, even as its list shifts during the day.

Which model: exactly the one gate G2 evaluated (src/model.py), so the number
on screen matches the published track record. Features are computed "as of
now" from the last 14 days of prices, the same way as in training.

Only markets like the ones the model was tested on get a number: training and
testing always happened 7 days before a market's scheduled end, so only
markets whose scheduled end is 1-21 days away are scored (pre-registered for
G2 run 2, docs/ml/evaluation.md). A market that ends in two years is a
different kind of question, and the model has no track record there.
"""

import argparse
import json
import re
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pandas as pd
import requests

from . import config
from .features import features_at
from .http import HttpError, get_json
from .model import explain, final_model, predict_rows
from .polymarket import category_of, to_utc, yes_index, yes_token_id

LIST_PAGES = 5
DAY = 86400


def open_markets():
    """The app's listMarkets query, page by page, de-duplicated, yes/no and open only."""
    rows, seen = [], set()
    for page in range(LIST_PAGES):
        params = {
            "active": "true",
            "closed": "false",
            "archived": "false",
            "order": "volume24hr",
            "ascending": "false",
            "include_tag": "true",
            "limit": config.PAGE_SIZE,
            "offset": page * config.PAGE_SIZE,
        }
        for raw in get_json(f"{config.GAMMA}/markets", params=params):
            if str(raw["id"]) in seen:
                continue
            seen.add(str(raw["id"]))
            rows.append(raw)
    return [raw for raw in rows if is_scorable(raw)]


def is_scorable(raw):
    """Same rules as the app's normalizeMarket: yes/no, a question, an end date, open."""
    return (
        yes_index(raw) != -1
        and bool((raw.get("question") or "").strip())
        and to_utc(raw.get("endDate")) is not None
        and bool(raw.get("active"))
        and not raw.get("closed")
        and yes_token_id(raw) is not None
    )


def markets_by_id(ids):
    """Raw Gamma markets for specific ids (open or closed), 50 at a time."""
    found = {}
    numbers = [i[3:] for i in ids]
    for start in range(0, len(numbers), 50):
        chunk = numbers[start : start + 50]
        for closed in ("false", "true"):
            params = [("id", n) for n in chunk] + [("closed", closed), ("include_tag", "true"), ("limit", "50")]
            for raw in get_json(f"{config.GAMMA}/markets", params=params):
                found[f"pm-{raw['id']}"] = raw
    return found


def features_now(raw, now):
    """Feature row for one market, as of `now` (unix seconds), or None."""
    params = {
        "market": yes_token_id(raw),
        "startTs": now - config.HISTORY_WINDOW_DAYS * DAY + 60,
        "endTs": now,
        "fidelity": config.HISTORY_FIDELITY_MINUTES,
    }
    try:
        body = get_json(f"{config.CLOB}/prices-history", params=params)
    except (HttpError, requests.RequestException):
        return None
    values = features_at(body.get("history", []), now)
    if values is None:
        return None
    return {"id": f"pm-{raw['id']}", "category": category_of(raw.get("tags"), raw.get("question")), **values}


def in_horizon(raw, now):
    """Scheduled end between SCORE_MIN_DAYS and SCORE_MAX_DAYS from now."""
    end = to_utc(raw.get("endDate"))
    if end is None:
        return False
    days = (end.timestamp() - now) / DAY
    return config.SCORE_MIN_DAYS <= days <= config.SCORE_MAX_DAYS


def score(model, raws, now):
    raws = [raw for raw in raws if in_horizon(raw, now)]
    with ThreadPoolExecutor(max_workers=config.HISTORY_WORKERS) as pool:
        rows = [row for row in pool.map(lambda raw: features_now(raw, now), raws) if row]
    if not rows:
        return {}
    frame = pd.DataFrame(rows)
    probabilities = predict_rows(model, frame)
    predictions = {}
    for row, p in zip(rows, probabilities):
        predictions[row["id"]] = {"probability": round(float(p), 4), "explanation": explain(model, row)}
    return predictions


def demo_picks(predictions, raws, now, count=5):
    """Markets that show the reveal well: a mid-range AI number, not closing today."""
    picks = []
    for raw in raws:
        entry = predictions.get(f"pm-{raw['id']}")
        days = (to_utc(raw["endDate"]).timestamp() - now) / DAY if raw.get("endDate") else 0
        if entry and 0.15 <= entry["probability"] <= 0.85 and days >= 2:
            picks.append((f"pm-{raw['id']}", entry["probability"], raw.get("question", "").strip()))
    return picks[:count]


def build_file(info, predictions, generated_at):
    return {
        "modelVersion": info["version"],
        "level": "model" if info["level"] == "A" else "signal",
        "generatedAt": generated_at,
        "metrics": info["metrics"],
        "predictions": predictions,
    }


def check_file(file):
    """The contract in docs/contracts/data.md §6. Raises if anything is off."""
    assert file["level"] in ("model", "signal"), file["level"]
    assert set(file["metrics"]) == {"testBrier", "crowdBrier", "n"}, file["metrics"]
    assert isinstance(file["modelVersion"], str) and isinstance(file["generatedAt"], str)
    for market_id, entry in file["predictions"].items():
        assert re.fullmatch(r"pm-\d+", market_id), market_id
        assert set(entry) == {"probability", "explanation"}, entry
        if file["level"] == "model":
            assert 0.01 <= entry["probability"] <= 0.99, (market_id, entry["probability"])
        assert len(entry["explanation"]) <= 3 and all(isinstance(line, str) for line in entry["explanation"])


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mocks", action="store_true", help="also write predictions for the mock-mode markets")
    parser.add_argument("--install", action="store_true", help="also copy into client/public/data")
    args = parser.parse_args(argv)

    if args.install and not config.APP_DATA_DIR.exists():
        print("client/public/data is missing")
        return 1

    model, info = final_model()
    if info["level"] == "C":
        print("G2 decided Level C: no predictions file is shipped (the app reports ML_DISABLED).")
        return 1

    now = int(time.time())
    generated_at = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    raws = open_markets()
    predictions = score(model, raws, now)
    file = build_file(info, predictions, generated_at)
    check_file(file)
    write_json(config.OUTPUT_DIR / "predictions.json", file)
    write_json(config.OUTPUT_DIR / "model.json", {**info, "generatedAt": generated_at})

    in_range = sum(in_horizon(raw, now) for raw in raws)
    print(
        f"scored {len(predictions)} of {len(raws)} open yes/no markets with {info['version']} (level {file['level']}); "
        f"{in_range} end within {config.SCORE_MIN_DAYS}-{config.SCORE_MAX_DAYS} days, the rest show NOT_SCORED"
    )

    print("good markets to demo:")
    for market_id, probability, question in demo_picks(predictions, raws, now):
        print(f"  {market_id}  AI {probability:.0%}  {question[:70]}")

    if args.mocks:
        mock_markets = json.loads((config.REPO_DIR / "client" / "src" / "mocks" / "markets.json").read_text(encoding="utf-8"))
        raw_by_id = markets_by_id([m["id"] for m in mock_markets])
        mock_predictions = score(model, [raw_by_id[m["id"]] for m in mock_markets if m["id"] in raw_by_id], now)
        mock_file = build_file(info, mock_predictions, generated_at)
        check_file(mock_file)
        write_json(config.REPO_DIR / "client" / "src" / "mocks" / "predictions.json", mock_file)
        print(f"mock mode: scored {len(mock_predictions)} of {len(mock_markets)} fixture markets")

    if args.install:
        shutil.copyfile(config.OUTPUT_DIR / "predictions.json", config.APP_DATA_DIR / "predictions.json")
        print("copied into client/public/data")
    return 0


if __name__ == "__main__":
    sys.exit(main())
