"""Reading raw Gamma markets, the same way the app's client/src/data/normalize.js does.

The category map and the yes/no and resolution rules here must match
normalize.js, so a market gets the same category in the app and in the model.
If you change one, change the other (and the test in tests/test_polymarket.py).
"""

import json
import re
from datetime import datetime, timezone

from . import config

CATEGORIES = ["Politics", "Sports", "Crypto", "Economy", "Tech & Science", "World", "Culture", "Other"]

TAGS = {
    "Crypto": ["crypto", "bitcoin", "ethereum", "solana", "xrp", "dogecoin", "crypto-prices", "stablecoins", "airdrops", "memecoins", "pre-market"],
    "Sports": [
        "sports", "nfl", "nba", "mlb", "nhl", "wnba", "ncaa", "soccer", "football", "basketball", "baseball", "hockey",
        "tennis", "golf", "f1", "formula-1", "formula 1", "ufc", "mma", "boxing", "cricket", "esports", "chess",
        "olympics", "ucl", "epl", "champions-league", "premier-league", "world-cup",
    ],
    "Economy": [
        "economy", "finance", "business", "fed", "fed-rates", "economic-policy", "inflation", "stocks", "ipo", "ipos",
        "commodities", "interest-rates", "earnings", "gdp", "tariffs", "oil", "equities", "treasuries", "recession",
    ],
    "Tech & Science": ["tech", "technology", "ai", "science", "space", "openai", "spacex", "big-tech", "artificial-intelligence"],
    "World": ["world", "geopolitics", "foreign-policy", "middle-east", "ukraine", "russia", "china", "israel", "europe", "global-elections"],
    "Politics": ["politics", "elections", "us-election", "us-politics", "congress", "senate", "midterms", "trump", "president", "governor-elections"],
    "Culture": [
        "culture", "pop-culture", "entertainment", "movies", "music", "awards", "celebrities", "tv", "tweet-markets",
        "elon-tweets", "mentions", "oscars", "grammys",
    ],
}
US_TAGS = ["united-states", "united states", "us-election", "us-politics", "trump", "congress", "senate", "midterms", "u.s. x iran", "trump-iran"]
KEYWORDS = [
    ("Crypto", r"\b(bitcoin|btc|ethereum|eth|solana|xrp|dogecoin|crypto|fdv|token)\b"),
    ("Sports", r"\b(nba|nfl|mlb|nhl|fifa|world cup|super bowl|champions league|premier league|grand prix|ufc|tennis|golf|open championship|world series|stanley cup)\b"),
    ("Economy", r"\b(fed|interest rates?|inflation|cpi|gdp|recession|ipo|s&p|nasdaq|dow|crude oil|treasury|yield|tariffs?)\b"),
    ("Tech & Science", r"\b(ai model|openai|chatgpt|gpt-\d|spacex|nasa|starship|apple|nvidia)\b"),
    ("Politics", r"\b(election|president|presidential|senate|congress|governor|prime minister|parliament|nominee|trump)\b"),
]


def parse_json_list(value):
    """Gamma sends outcomes, outcomePrices and clobTokenIds as JSON inside a string."""
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        return None
    try:
        parsed = json.loads(value)
    except ValueError:
        return None
    return parsed if isinstance(parsed, list) else None


def to_utc(value):
    """Parse every Gamma date format into an aware UTC datetime, or None."""
    if not isinstance(value, str) or not value.strip():
        return None
    tidy = value.strip().replace(" ", "T").replace("Z", "+00:00")
    tidy = re.sub(r"(\.\d{6})\d+", r"\1", tidy)
    tidy = re.sub(r"([+-]\d{2})$", r"\1:00", tidy)
    try:
        parsed = datetime.fromisoformat(tidy)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def iso(moment):
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def yes_index(raw):
    outcomes = parse_json_list(raw.get("outcomes"))
    if not outcomes or len(outcomes) != 2:
        return -1
    names = [str(name).strip().lower() for name in outcomes]
    if "yes" not in names or "no" not in names:
        return -1
    return names.index("yes")


def yes_price(raw):
    index = yes_index(raw)
    prices = parse_json_list(raw.get("outcomePrices"))
    if index == -1 or not prices:
        return None
    try:
        return float(prices[index])
    except (TypeError, ValueError):
        return None


def yes_token_id(raw):
    index = yes_index(raw)
    tokens = parse_json_list(raw.get("clobTokenIds"))
    if index == -1 or not tokens:
        return None
    return str(tokens[index])


def label(raw):
    """YES / NO for a cleanly resolved market, None for anything ambiguous."""
    price = yes_price(raw)
    if not raw.get("closed") or price is None:
        return None
    if price >= config.RESOLVED_HIGH:
        return "YES"
    if price <= config.RESOLVED_LOW:
        return "NO"
    return None


def category_of(tags, question=""):
    names = set()
    for tag in tags or []:
        if tag.get("slug"):
            names.add(str(tag["slug"]).lower())
        if tag.get("label"):
            names.add(str(tag["label"]).lower())

    def has(words):
        return any(word in names for word in words)

    if has(TAGS["Crypto"]):
        return "Crypto"
    if has(TAGS["Sports"]):
        return "Sports"
    if has(TAGS["Economy"]):
        return "Economy"
    if has(TAGS["Tech & Science"]):
        return "Tech & Science"
    if has(TAGS["World"]) and not has(US_TAGS):
        return "World"
    if has(TAGS["Politics"]):
        return "Politics"
    if has(TAGS["World"]):
        return "World"
    if has(TAGS["Culture"]):
        return "Culture"
    for category, pattern in KEYWORDS:
        if re.search(pattern, question or "", re.IGNORECASE):
            return category
    return "Other"


def event_slug(raw):
    events = raw.get("events") or []
    return (events[0].get("slug") if events else None) or raw.get("slug") or str(raw.get("id"))
