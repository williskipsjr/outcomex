import unittest

import numpy as np

from src.train import choose, g2_decision


def bucket(mean_forecast, yes_rate, count):
    return {"mean_forecast": mean_forecast, "yes_rate": yes_rate, "count": count}


class GateG2(unittest.TestCase):
    crowd = {"brier": 0.170}
    calibrated = [bucket(0.1, 0.12, 50), bucket(0.8, 0.75, 25), bucket(0.5, 0.9, 5)]  # the last one is too small to count

    def test_level_a_when_close_to_the_crowd_and_calibrated(self):
        decision = g2_decision({"brier": 0.175}, self.crowd, self.calibrated)
        self.assertEqual(decision["level"], "A")
        self.assertEqual(decision["calibration_buckets_checked"], 2)

    def test_level_b_when_more_than_0_01_worse_than_the_crowd(self):
        self.assertEqual(g2_decision({"brier": 0.19}, self.crowd, self.calibrated)["level"], "B")

    def test_level_b_when_badly_calibrated(self):
        rows = [bucket(0.2, 0.45, 30)]
        self.assertEqual(g2_decision({"brier": 0.17}, self.crowd, rows)["level"], "B")

    def test_level_c_when_no_better_than_a_coin_flip_or_leaky(self):
        self.assertEqual(g2_decision({"brier": 0.26}, self.crowd, self.calibrated)["level"], "C")
        self.assertEqual(g2_decision({"brier": 0.17}, self.crowd, self.calibrated, leak_free=False)["level"], "C")


class Choice(unittest.TestCase):
    def test_prefers_the_simplest_model_when_the_gap_is_noise(self):
        rng = np.random.default_rng(0)
        y = rng.integers(0, 2, 120)
        base = np.clip(y * 0.6 + 0.2 + rng.normal(0, 0.05, 120), 0.01, 0.99)
        predictions = {"lr_crowd": base, "lr_price": np.clip(base + 0.001, 0.01, 0.99), "lr_full": base, "hgb": base}
        results = {name: {"brier": float(np.mean((p - y) ** 2))} for name, p in predictions.items()}
        results["lr_price"]["brier"] -= 0.0001  # "best", but only by noise
        chosen, best = choose(results, y, predictions)
        self.assertEqual(best, "lr_price")
        self.assertEqual(chosen, "lr_crowd")

    def test_keeps_a_clearly_better_model(self):
        rng = np.random.default_rng(1)
        y = rng.integers(0, 2, 300)
        good = np.where(y == 1, 0.9, 0.1)
        bad = np.full(300, 0.5)
        predictions = {"lr_crowd": bad, "lr_price": good, "lr_full": bad, "hgb": bad}
        results = {name: {"brier": float(np.mean((p - y) ** 2))} for name, p in predictions.items()}
        self.assertEqual(choose(results, y, predictions), ("lr_price", "lr_price"))


if __name__ == "__main__":
    unittest.main()
