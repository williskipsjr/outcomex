import unittest

import pandas as pd

from src.calibration import analyse, wilson_interval


class WilsonInterval(unittest.TestCase):
    def test_contains_the_share(self):
        low, high = wilson_interval(30, 100)
        self.assertLess(low, 0.3)
        self.assertGreater(high, 0.3)

    def test_stays_honest_at_the_edges(self):
        low, high = wilson_interval(0, 20)
        self.assertEqual(low, 0.0)
        self.assertGreater(high, 0.05)  # 0 of 20 doesn't prove "never"
        low, high = wilson_interval(20, 20)
        self.assertLess(low, 0.95)
        self.assertEqual(high, 1.0)

    def test_narrows_with_more_markets(self):
        small = wilson_interval(5, 10)
        large = wilson_interval(500, 1000)
        self.assertGreater(small[1] - small[0], large[1] - large[0])
        self.assertIsNone(wilson_interval(0, 0))


class Analyse(unittest.TestCase):
    def test_flags_a_bucket_far_from_its_price(self):
        table = pd.DataFrame({"crowd": [0.75] * 100 + [0.15] * 100, "y": [0] * 100 + [0] * 85 + [1] * 15})
        rows = {row["from"]: row for row in analyse(table)}
        self.assertFalse(rows[0.7]["forecast_inside_interval"])  # said 75%, never happened
        self.assertTrue(rows[0.1]["forecast_inside_interval"])  # said 15%, happened 15%
        self.assertIsNone(rows[0.4]["forecast_inside_interval"])  # no markets there


if __name__ == "__main__":
    unittest.main()
