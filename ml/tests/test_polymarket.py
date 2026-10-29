"""Run from ml/:  python -m unittest discover -s tests"""

import json
import unittest
from datetime import datetime, timezone

from src import config
from src.polymarket import category_of, label, parse_json_list, to_utc, yes_price, yes_token_id

CASES = config.REPO_DIR / "client" / "src" / "data" / "__fixtures__" / "category-cases.json"
RAW = config.REPO_DIR / "client" / "src" / "data" / "__fixtures__" / "gamma-raw.json"


def tags(*labels):
    return [{"label": name, "slug": name.lower().replace(" ", "-")} for name in labels]


class CategoryParity(unittest.TestCase):
    def test_same_categories_as_the_app(self):
        for case in json.loads(CASES.read_text(encoding="utf-8"))["cases"]:
            with self.subTest(case["question"]):
                self.assertEqual(category_of(tags(*case["tags"]), case["question"]), case["expected"])


class ReadingGamma(unittest.TestCase):
    raw = json.loads(RAW.read_text(encoding="utf-8"))

    def test_json_in_a_string(self):
        self.assertEqual(parse_json_list('["Yes", "No"]'), ["Yes", "No"])
        self.assertIsNone(parse_json_list("[broken"))

    def test_dates(self):
        expected = datetime(2026, 10, 29, 19, 47, 10, 221006, tzinfo=timezone.utc)
        self.assertEqual(to_utc("2026-10-29 19:47:10.221006+00"), expected)
        self.assertEqual(to_utc("2027-01-01T04:59:00Z"), datetime(2027, 1, 1, 4, 59, tzinfo=timezone.utc))
        self.assertIsNone(to_utc("nope"))

    def test_real_markets(self):
        iran = self.raw["openMarkets"][0]
        self.assertEqual(yes_price(iran), 0.195)
        self.assertEqual(yes_token_id(iran), json.loads(iran["clobTokenIds"])[0])
        self.assertIsNone(label(iran))  # still open
        self.assertEqual(label(self.raw["closedMarket"]), "NO")

    def test_ambiguous_resolutions_are_dropped(self):
        closed = {"closed": True, "outcomes": '["Yes","No"]'}
        self.assertEqual(label({**closed, "outcomePrices": '["0.995","0.005"]'}), "YES")
        self.assertIsNone(label({**closed, "outcomePrices": '["0.5","0.5"]'}))
        self.assertIsNone(label({**closed, "outcomes": '["A","B"]', "outcomePrices": '["1","0"]'}))


if __name__ == "__main__":
    unittest.main()
