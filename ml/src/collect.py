"""Step 1 of the pipeline: download raw data, and nothing else.

    python -m src.collect markets     # top closed markets per month -> data/raw/markets/
    python -m src.collect histories   # 14 days of prices before each as-of time -> data/raw/history/

Both steps are resumable: files already on disk are skipped, so an
interrupted run (or a rate limit) just means running it again.
"""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone

from . import config
from .http import HttpError, get_json
from .polymarket import iso, label, to_utc, yes_index, yes_token_id


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value), encoding="utf-8")
    tmp.replace(path)  # never leave a half-written file behind


def months(since, until):
    """('2025-07', start, end) for every month from `since` up to the current one."""
    year, month = int(since[:4]), int(since[5:7])
    while (year, month) <= (until.year, until.month):
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
        yield start.strftime("%Y-%m"), start, datetime(year, month, 1, tzinfo=timezone.utc)


def collect_markets():
    """For each month: the highest-volume closed markets that ended in it."""
    for name, start, end in months(config.COLLECT_SINCE, datetime.now(timezone.utc)):
        for page in range(config.PAGES_PER_MONTH):
            path = config.RAW_MARKETS_DIR / f"{name}_p{page}.json"
            if path.exists():
                continue
            params = {
                "closed": "true",
                "order": "volumeNum",
                "ascending": "false",
                "volume_num_min": config.MIN_VOLUME_USD,
                "end_date_min": iso(start),
                "end_date_max": iso(end),
                "include_tag": "true",
                "limit": config.PAGE_SIZE,
                "offset": page * config.PAGE_SIZE,
            }
            rows = get_json(f"{config.GAMMA}/markets", params=params)
            save(path, rows)
            print(f"{name} page {page}: {len(rows)} markets", flush=True)
            if len(rows) < config.PAGE_SIZE:
                break


def load_raw_markets():
    seen = {}
    for path in sorted(config.RAW_MARKETS_DIR.glob("*.json")):
        for raw in json.loads(path.read_text(encoding="utf-8")):
            seen[str(raw["id"])] = raw
    return list(seen.values())


def close_time(raw):
    """When trading actually stopped: closedTime if Gamma has it, else endDate."""
    return to_utc(raw.get("closedTime")) or to_utc(raw.get("endDate"))


def history_candidates(rows):
    """Markets worth one CLOB call: clean yes/no label and a known close time."""
    for raw in rows:
        if yes_index(raw) == -1 or label(raw) is None or not yes_token_id(raw):
            continue
        if close_time(raw) is None:
            continue
        yield raw


def collect_histories():
    rows = load_raw_markets()
    candidates = list(history_candidates(rows))
    print(f"{len(rows)} raw markets, {len(candidates)} need a price history")
    done = failed = 0
    for number, raw in enumerate(candidates, start=1):
        path = config.RAW_HISTORY_DIR / f"{raw['id']}.json"
        if path.exists():
            continue
        as_of = close_time(raw) - timedelta(days=config.AS_OF_DAYS)
        start = as_of - timedelta(days=config.HISTORY_WINDOW_DAYS) + timedelta(minutes=1)
        params = {
            "market": yes_token_id(raw),
            "startTs": int(start.timestamp()),
            "endTs": int(as_of.timestamp()),
            "fidelity": config.HISTORY_FIDELITY_MINUTES,
        }
        try:
            body = get_json(f"{config.CLOB}/prices-history", params=params)
        except HttpError as error:
            body = {"history": [], "error": str(error)}
            failed += 1
        save(path, {"marketId": str(raw["id"]), "asOf": int(as_of.timestamp()), "history": body.get("history", []), "error": body.get("error")})
        done += 1
        if number % 100 == 0:
            print(f"  {number}/{len(candidates)} ({failed} failed)", flush=True)
    print(f"downloaded {done} histories, {failed} failed")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("step", choices=["markets", "histories"])
    args = parser.parse_args(argv)
    if args.step == "markets":
        collect_markets()
    else:
        collect_histories()


if __name__ == "__main__":
    sys.exit(main())
