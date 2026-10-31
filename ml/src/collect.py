"""Step 1 of the pipeline: download raw data, and nothing else.

    python -m src.collect markets     # top closed markets per month -> data/raw/markets/
    python -m src.collect histories   # 14 days of prices before each as-of time -> data/raw/history/

Both steps are resumable: files already on disk are skipped (a price window
only counts if it ends at the market's current as-of time), so an interrupted
run (or a rate limit) just means running it again.
"""

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import requests

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
    """When trading actually stopped: closedTime if Gamma has it, else endDate.
    Used only to check that a market was still open at its as-of time."""
    return to_utc(raw.get("closedTime")) or to_utc(raw.get("endDate"))


def as_of_time(raw):
    """Scheduled end - 7 days. The scheduled end is known in advance, so the
    as-of time can't depend on the outcome. (Anchoring on the actual close did:
    YES markets often close early, the moment the event happens. That leaked
    the outcome into G2 run 1; see docs/ml/evaluation.md.)"""
    end = to_utc(raw.get("endDate"))
    return end - timedelta(days=config.AS_OF_DAYS) if end else None


def open_at_as_of(raw):
    """Still trading at its as-of time: it didn't close before scheduled end - 7 days."""
    as_of, closed = as_of_time(raw), close_time(raw)
    return as_of is not None and closed is not None and closed > as_of


def history_candidates(rows):
    """Markets worth one CLOB call: clean yes/no label, still open at as-of."""
    for raw in rows:
        if yes_index(raw) == -1 or label(raw) is None or not yes_token_id(raw):
            continue
        if not open_at_as_of(raw):
            continue
        yield raw


def history_path(raw):
    return config.RAW_HISTORY_DIR / f"{raw['id']}.json"


def has_current_history(raw):
    """A saved window counts only if it ends at this market's current as-of time."""
    path = history_path(raw)
    if not path.exists():
        return False
    saved = json.loads(path.read_text(encoding="utf-8"))
    return saved.get("asOf") == int(as_of_time(raw).timestamp())


def download_history(raw):
    """One CLOB call: the 14 days of prices that end at this market's as-of time."""
    as_of = as_of_time(raw)
    start = as_of - timedelta(days=config.HISTORY_WINDOW_DAYS) + timedelta(minutes=1)
    params = {
        "market": yes_token_id(raw),
        "startTs": int(start.timestamp()),
        "endTs": int(as_of.timestamp()),
        "fidelity": config.HISTORY_FIDELITY_MINUTES,
    }
    try:
        body = get_json(f"{config.CLOB}/prices-history", params=params)
        error = None
    except (HttpError, requests.RequestException) as failure:
        body, error = {"history": []}, str(failure)
    save(
        history_path(raw),
        {"marketId": str(raw["id"]), "asOf": int(as_of.timestamp()), "history": body.get("history", []), "error": error},
    )
    return error is None


def collect_histories():
    rows = load_raw_markets()
    candidates = list(history_candidates(rows))
    todo = [raw for raw in candidates if not has_current_history(raw)]
    print(f"{len(rows)} raw markets, {len(candidates)} need a price history, {len(todo)} still to download", flush=True)
    failed = 0
    with ThreadPoolExecutor(max_workers=config.HISTORY_WORKERS) as pool:
        for number, ok in enumerate(pool.map(download_history, todo), start=1):
            failed += 0 if ok else 1
            if number % 100 == 0:
                print(f"  {number}/{len(todo)} ({failed} failed)", flush=True)
    print(f"downloaded {len(todo)} histories, {failed} failed", flush=True)


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
