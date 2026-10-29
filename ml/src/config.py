"""Paths and the choices every pipeline step shares, in one place."""

from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = ML_DIR.parent

RAW_DIR = ML_DIR / "data" / "raw"  # git-ignored: raw API pages, never edited
RAW_MARKETS_DIR = RAW_DIR / "markets"
RAW_HISTORY_DIR = RAW_DIR / "history"
INTERIM_DIR = ML_DIR / "data" / "interim"  # git-ignored: cleaned tables
OUTPUT_DIR = ML_DIR / "output"  # JSON files that get copied into client/public/data
REPORTS_DIR = ML_DIR / "reports"
APP_DATA_DIR = REPO_DIR / "client" / "public" / "data"

GAMMA = "https://gamma-api.polymarket.com"
CLOB = "https://clob.polymarket.com"

# The "time machine": every feature and the crowd baseline are taken this
# many days before the market closed (master plan §6.4)
AS_OF_DAYS = 7

# CLOB refuses a startTs/endTs window longer than 14 days, which is also
# exactly the look-back the volatility feature needs. We only ever download
# the 14 days that END at the as-of time, so no price after as-of can leak in.
HISTORY_WINDOW_DAYS = 14
HISTORY_FIDELITY_MINUTES = 60

# Cleaning rules (ML role guide §6). Report any change in the feasibility report.
MIN_VOLUME_USD = 5_000
MIN_LIFETIME_DAYS = 14
RESOLVED_HIGH = 0.99
RESOLVED_LOW = 0.01
AS_OF_PRICE_MAX_GAP_HOURS = 24

# Collection
# Month by month, the highest-volume closed markets of each month. Sorting
# all closed markets by close time instead gives thousands of small sports
# games from the last day, which is useless for a time-based split.
COLLECT_SINCE = "2025-07-01"  # first month collected
PAGE_SIZE = 100  # Gamma never returns more than 100 rows per page
PAGES_PER_MONTH = 2
REQUEST_PAUSE_SECONDS = 0.25  # be polite: Polymarket is a free public API
HISTORY_WORKERS = 3  # parallel downloads for price histories; each still pauses between calls

SEED = 2026
