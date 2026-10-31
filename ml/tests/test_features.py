import math
import unittest

from src.features import FEATURES, features_at, logit, price_at

DAY = 86400
AS_OF = 1_780_000_000


def hourly(prices_by_day):
    """{days_before_as_of: price} -> hourly points, flat within each day."""
    points = []
    for days_before, price in prices_by_day.items():
        start = AS_OF - days_before * DAY
        points += [{"t": start + h * 3600, "p": price} for h in range(24) if start + h * 3600 <= AS_OF]
    return points


class NoLeakage(unittest.TestCase):
    def test_prices_after_as_of_never_change_the_features(self):
        past = hourly({14: 0.30, 7: 0.40, 1: 0.50, 0: 0.55})
        future = [{"t": AS_OF + 3600 * h, "p": 0.99} for h in range(1, 200)]
        self.assertEqual(features_at(past, AS_OF), features_at(past + future, AS_OF))

    def test_no_known_price_means_no_row(self):
        self.assertIsNone(features_at([{"t": AS_OF + 60, "p": 0.5}], AS_OF))
        self.assertIsNone(features_at([], AS_OF))


class Values(unittest.TestCase):
    def test_moves_and_current_price(self):
        f = features_at(hourly({14: 0.30, 7: 0.40, 1: 0.50, 0: 0.55}), AS_OF)
        self.assertEqual(set(f), set(FEATURES))
        self.assertAlmostEqual(f["crowd"], 0.55)
        self.assertAlmostEqual(f["crowd_logit"], math.log(0.55 / 0.45))
        self.assertAlmostEqual(f["move_7d"], 0.55 - 0.40)
        self.assertAlmostEqual(f["move_1d"], 0.55 - 0.50)
        self.assertAlmostEqual(f["range_14d"], 0.25)
        self.assertGreater(f["volatility_14d"], 0)
        self.assertAlmostEqual(f["hours_since_trade"], 0)

    def test_flat_market_has_no_movement(self):
        f = features_at(hourly({d: 0.2 for d in range(15)}), AS_OF)
        self.assertEqual((f["move_1d"], f["move_7d"], f["volatility_14d"], f["range_14d"]), (0, 0, 0, 0))

    def test_short_window_compares_with_the_first_price(self):
        f = features_at(hourly({2: 0.6, 0: 0.7}), AS_OF)
        self.assertAlmostEqual(f["move_7d"], 0.1)

    def test_helpers(self):
        self.assertEqual(price_at([(1, 0.1), (5, 0.2)], 4), 0.1)
        self.assertIsNone(price_at([(5, 0.2)], 4))
        self.assertAlmostEqual(logit(1.0), math.log(0.99 / 0.01))


if __name__ == "__main__":
    unittest.main()
