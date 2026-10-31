import unittest

import pandas as pd

from src.practice import build_files, candidates, cap_per_group, check_files, is_sensitive, select_practice


def market(i, y, group=None, crowd=0.4, split="test", category="Sports", volume=1000.0, question=None):
    return {
        "id": i,
        "question": question or f"Will thing {i} happen?",
        "category": category,
        "group": group or f"g{i}",
        "as_of": "2026-07-13T00:00:00Z",
        "close": f"2026-07-{10 + i % 18:02d}T00:00:00Z",
        "closed_at": f"2026-07-{10 + i % 18:02d}T06:00:00Z",
        "outcome": "YES" if y else "NO",
        "y": y,
        "crowd_as_of": crowd,
        "volume": volume,
        "split": split,
    }


class Filters(unittest.TestCase):
    def test_only_test_split_undecided_and_not_sensitive(self):
        table = pd.DataFrame(
            [
                market(1, 1),
                market(2, 0, split="train"),
                market(3, 0, crowd=0.99),
                market(4, 0, crowd=0.01),
                market(5, 1, question="Will the hostages be released?"),
                market(6, 0),
            ]
        )
        self.assertEqual(sorted(candidates(table, {}).id), [1, 6])

    def test_sensitive_words(self):
        self.assertTrue(is_sensitive("Will the CEO be killed?"))
        self.assertTrue(is_sensitive("Normal question", "after the assassination attempt"))
        self.assertFalse(is_sensitive("Will Bitcoin dip to $55,000?"))
        self.assertFalse(is_sensitive("Will the Fed cut rates?"))


class Selection(unittest.TestCase):
    def test_at_most_two_per_event_keeping_yes_first(self):
        pool = pd.DataFrame([market(i, 1 if i == 4 else 0, group="cup", volume=100 - i) for i in range(1, 6)])
        kept = cap_per_group(pool)
        self.assertEqual(len(kept), 2)
        self.assertIn(4, list(kept.id))

    def test_balance_between_40_and_60_percent_yes(self):
        rows = [market(i, 1) for i in range(1, 11)] + [market(i, 0) for i in range(11, 61)]
        chosen = select_practice(pd.DataFrame(rows))
        share = chosen["y"].mean()
        self.assertGreaterEqual(share, 0.4)
        self.assertLessEqual(share, 0.6)
        self.assertEqual(int(chosen["y"].sum()), 10)

    def test_no_markets_spread_over_categories(self):
        rows = [market(i, 1) for i in range(1, 5)]
        rows += [market(i, 0, category="Sports", volume=10_000 - i) for i in range(10, 30)]
        rows += [market(i, 0, category="Economy") for i in range(30, 33)]
        chosen = select_practice(pd.DataFrame(rows))
        self.assertGreater((chosen.category == "Economy").sum(), 0)


class Files(unittest.TestCase):
    def test_list_never_contains_the_answer(self):
        chosen = pd.DataFrame([market(1, 1, crowd=0.3), market(2, 0, crowd=0.6)])
        raw = {"1": {"description": "Rules", "image": "https://x/1.png"}, "2": {"icon": "https://x/2.png"}}
        practice_list, practice_answers = build_files(chosen, raw, "2026-10-31T00:00:00Z")
        check_files(practice_list, practice_answers)
        for item in practice_list["items"]:
            self.assertNotIn("outcome", item)
            self.assertNotIn("crowdProbabilityAsOf", item)
        self.assertEqual(practice_list["items"][1]["imageUrl"], "https://x/2.png")
        self.assertEqual(practice_answers["answers"]["pr-1"]["outcome"], "YES")
        self.assertIsNone(practice_answers["answers"]["pr-1"]["aiProbability"])
        with_ai = build_files(chosen, raw, "2026-11-01T00:00:00Z", {1: 0.27}, "lr-test")[1]["answers"]
        self.assertEqual((with_ai["pr-1"]["aiProbability"], with_ai["pr-1"]["modelVersion"]), (0.27, "lr-test"))
        self.assertEqual((with_ai["pr-2"]["aiProbability"], with_ai["pr-2"]["modelVersion"]), (None, None))
        # closedDate is the scheduled end; resolvedAt (only shown after the call) is the actual close
        self.assertEqual(practice_list["items"][0]["closedDate"], chosen.iloc[0]["close"])
        self.assertEqual(practice_answers["answers"]["pr-1"]["resolvedAt"], chosen.iloc[0]["closed_at"])


if __name__ == "__main__":
    unittest.main()
