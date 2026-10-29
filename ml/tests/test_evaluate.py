import unittest

import pandas as pd

from src.evaluate import bootstrap_difference, brier, calibration, expected_calibration_error, log_loss, time_group_split


class Metrics(unittest.TestCase):
    def test_brier_matches_the_app(self):
        # Same examples as the PM's hand-check sheet idea: perfect, confident miss, coin flip
        self.assertAlmostEqual(brier([0.99], [1]), 0.0001)
        self.assertAlmostEqual(brier([0.9], [0]), 0.81)
        self.assertAlmostEqual(brier([0.5, 0.5], [0, 1]), 0.25)

    def test_log_loss_is_finite_at_the_edges(self):
        self.assertLess(log_loss([1.0, 0.0], [1, 0]), 1e-5)
        self.assertLess(log_loss([0.0], [1]), 20)

    def test_calibration_buckets(self):
        rows = calibration([0.05, 0.15, 0.95, 1.0], [0, 0, 1, 1])
        self.assertEqual([row["count"] for row in rows], [1, 1, 0, 0, 0, 0, 0, 0, 0, 2])
        self.assertAlmostEqual(expected_calibration_error([0.7] * 10, [1] * 7 + [0] * 3), 0.0)

    def test_bootstrap_says_no_difference_for_identical_forecasts(self):
        result = bootstrap_difference([0.3, 0.6, 0.8], [0.3, 0.6, 0.8], [0, 1, 1], rounds=200)
        self.assertTrue(result["no_difference"])


class Split(unittest.TestCase):
    def test_groups_never_span_splits_and_test_is_newest(self):
        rows = []
        for g in range(20):
            for k in range(3):
                rows.append({"group": f"g{g}", "close": f"2026-{1 + g // 2:02d}-{10 + k}T00:00:00Z"})
        table = pd.DataFrame(rows)
        split = time_group_split(table)
        self.assertEqual(table.assign(s=split).groupby("group")["s"].nunique().max(), 1)
        self.assertEqual(sorted(set(split)), ["test", "train", "validation"])
        newest_train = table.loc[split == "train", "close"].max()
        oldest_test = table.loc[split == "test", "close"].min()
        self.assertLess(newest_train, oldest_test)


if __name__ == "__main__":
    unittest.main()
