import unittest
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from src.model import explain, gap_parts, percent
from src.predict import build_file, check_file, spot_check_picks, in_horizon, is_scorable
from src.train import fit


def synthetic_table(n=400, seed=7):
    rng = np.random.default_rng(seed)
    crowd = rng.uniform(0.02, 0.98, n)
    category = rng.choice(["Sports", "Politics", "World"], n)
    y = (rng.uniform(0, 1, n) < np.where(category == "Sports", crowd * 0.7, crowd)).astype(int)
    return pd.DataFrame(
        {
            "crowd": crowd,
            "crowd_logit": np.log(crowd / (1 - crowd)),
            "move_1d": rng.normal(0, 0.03, n),
            "move_7d": rng.normal(0, 0.08, n),
            "volatility_14d": rng.uniform(0, 0.05, n),
            "range_14d": rng.uniform(0, 0.3, n),
            "hours_since_trade": rng.uniform(0, 5, n),
            "category": category,
            "group": [f"g{i}" for i in range(n)],
            "y": y,
        }
    )


class Explanations(unittest.TestCase):
    table = synthetic_table()
    model = fit("lr_full", table, 1.0)

    def test_parts_add_up_to_the_gap(self):
        for _, row in self.table.head(50).iterrows():
            parts, gap = gap_parts(self.model, row.to_dict())
            self.assertAlmostEqual(sum(parts.values()), gap, places=9)

    def test_sentences_never_contradict_the_direction(self):
        for _, row in self.table.head(80).iterrows():
            lines = explain(self.model, row.to_dict())
            self.assertLessEqual(len(lines), 3)
            if "raises" in lines[0]:
                self.assertFalse(any("less often" in line for line in lines[1:]), lines)
            if "lowers" in lines[0]:
                self.assertFalse(any("more often" in line for line in lines[1:]), lines)

    def test_percent_wording(self):
        self.assertEqual(percent(0.004), "under 1%")
        self.assertEqual(percent(0.996), "over 99%")
        self.assertEqual(percent(0.375), "38%")


class PredictionsFile(unittest.TestCase):
    info = {"version": "lr-test", "level": "A", "metrics": {"testBrier": 0.07, "crowdBrier": 0.06, "n": 200}}

    def test_contract_shape(self):
        file = build_file(self.info, {"pm-1": {"probability": 0.3, "explanation": ["a", "b"]}}, "2026-10-31T00:00:00Z")
        check_file(file)
        self.assertEqual(file["level"], "model")

    def test_rejects_bad_entries(self):
        for bad in [{"pm-x": {"probability": 0.3, "explanation": []}}, {"pm-1": {"probability": 1.0, "explanation": []}}, {"pm-1": {"probability": 0.3, "explanation": ["1", "2", "3", "4"]}}]:
            with self.assertRaises(AssertionError):
                check_file(build_file(self.info, bad, "2026-10-31T00:00:00Z"))

    def test_only_markets_1_to_21_days_from_their_scheduled_end(self):
        now = 1_790_000_000
        def at(days):
            end = datetime.fromtimestamp(now + days * 86400, timezone.utc)
            return {"endDate": end.strftime("%Y-%m-%dT%H:%M:%SZ")}
        self.assertTrue(in_horizon(at(7), now))
        self.assertTrue(in_horizon(at(1.5), now))
        self.assertFalse(in_horizon(at(0.5), now))
        self.assertFalse(in_horizon(at(60), now))
        self.assertFalse(in_horizon({"endDate": None}, now))

    def test_spot_check_picks_are_mid_range_and_not_closing_today(self):
        now = 1_790_000_000

        def raw(market_id, days):
            end = datetime.fromtimestamp(now + days * 86400, timezone.utc)
            return {"id": market_id, "question": "Q?", "endDate": end.strftime("%Y-%m-%dT%H:%M:%SZ")}

        predictions = {"pm-1": {"probability": 0.4}, "pm-2": {"probability": 0.97}, "pm-3": {"probability": 0.4}}
        picks = spot_check_picks(predictions, [raw(1, 5), raw(2, 5), raw(3, 1), raw(4, 5)], now)
        self.assertEqual([pick[0] for pick in picks], ["pm-1"])

    def test_scorable_matches_the_apps_rules(self):
        base = {"outcomes": '["Yes","No"]', "clobTokenIds": '["1","2"]', "question": "Q?", "endDate": "2026-11-05T00:00:00Z", "active": True, "closed": False}
        self.assertTrue(is_scorable(base))
        self.assertFalse(is_scorable({**base, "closed": True}))
        self.assertFalse(is_scorable({**base, "outcomes": '["A","B"]'}))
        self.assertFalse(is_scorable({**base, "question": " "}))


if __name__ == "__main__":
    unittest.main()
