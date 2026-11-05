"""Step 5 (ML-06): train, choose a model on validation, then evaluate ONCE on test.

    python -m src.train            # validation only: fit on train, compare on validation
    python -m src.train --test     # the one-time test evaluation that decides gate G2
    python -m src.train --choose lr_full --reason "..."   # record a human override first, if any
    python -m src.train --replot   # redraw the test chart from the saved results; scores nothing

The test split is the newest 15% of event groups. --test refuses to run if
reports/evaluation.json already exists: the number we report is the first
number we saw. Delete that file only if the evaluation itself was broken, and
say so in docs/ml/evaluation.md.

Candidates, simplest first:
  lr_crowd   logistic regression on the crowd's log-odds only (a recalibrated crowd)
  lr_price   + the price features (moves, volatility, range, staleness)
  lr_full    + category
  hgb        gradient boosting on everything, isotonic-calibrated within train

Choice rule: take the lowest validation Brier, then step back to the simplest
model that is not significantly worse than it (its bootstrap interval for the
difference contains 0). Validation has only ~124 markets, so small gaps are noise.
"""

import argparse
import json
import os
import sys

# scikit-learn's worker pool otherwise prints a traceback while counting CPU cores on Windows
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

from . import config
from .evaluate import bootstrap_difference, brier, calibration, metrics
from .polymarket import CATEGORIES

PRICE = ["crowd_logit", "move_1d", "move_7d", "volatility_14d", "range_14d", "hours_since_trade"]
C_GRID = [0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0]
CLIP = (0.01, 0.99)


def log_hours(frame):
    """Hours since the last trade is heavily skewed; log it (when the model uses it)."""
    if "hours_since_trade" not in frame:
        return frame
    frame = frame.copy()
    frame["hours_since_trade"] = np.log1p(frame["hours_since_trade"].clip(lower=0))
    return frame


def logistic(columns, with_category, C):
    transformers = [("num", Pipeline([("log", FunctionTransformer(log_hours, feature_names_out="one-to-one")), ("scale", StandardScaler())]), columns)]
    if with_category:
        transformers.append(("cat", OneHotEncoder(categories=[CATEGORIES], handle_unknown="ignore"), ["category"]))
    return Pipeline(
        [
            ("features", ColumnTransformer(transformers)),
            ("model", LogisticRegression(C=C, max_iter=2000)),
        ]
    )


def boosting(groups):
    transformers = [
        ("num", FunctionTransformer(log_hours, feature_names_out="one-to-one"), PRICE),
        ("cat", OneHotEncoder(categories=[CATEGORIES], handle_unknown="ignore", sparse_output=False), ["category"]),
    ]
    model = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200, l2_regularization=1.0, random_state=config.SEED)
    # Isotonic calibration fitted on train only, with folds that keep each event together
    folds = list(GroupKFold(n_splits=5).split(np.zeros(len(groups)), groups=groups))
    return Pipeline(
        [
            ("features", ColumnTransformer(transformers)),
            ("model", CalibratedClassifierCV(model, method="isotonic", cv=folds)),
        ]
    )


CANDIDATES = {
    "lr_crowd": {"columns": ["crowd_logit"], "category": False},
    "lr_price": {"columns": PRICE, "category": False},
    "lr_full": {"columns": PRICE, "category": True},
    "hgb": None,
}


def predict(model, frame):
    return np.clip(model.predict_proba(frame)[:, 1], *CLIP)


def tune_c(spec, train):
    """C by 5-fold cross-validation inside train, folds grouped by event."""
    folds = GroupKFold(n_splits=5)
    scores = {}
    for C in C_GRID:
        fold_scores = []
        for fit_idx, score_idx in folds.split(train, groups=train["group"]):
            model = logistic(spec["columns"], spec["category"], C).fit(train.iloc[fit_idx], train["y"].iloc[fit_idx])
            fold_scores.append(brier(predict(model, train.iloc[score_idx]), train["y"].iloc[score_idx]))
        scores[C] = float(np.mean(fold_scores))
    best = min(scores, key=scores.get)
    return best, {str(c): round(s, 5) for c, s in scores.items()}


def fit(name, train, C=None):
    if name == "hgb":
        return boosting(train["group"].to_numpy()).fit(train, train["y"])
    spec = CANDIDATES[name]
    return logistic(spec["columns"], spec["category"], C).fit(train, train["y"])


def choose(results, y, predictions):
    """Lowest Brier, then the simplest model not significantly worse than it."""
    order = list(CANDIDATES)
    best = min(order, key=lambda name: results[name]["brier"])
    for name in order:
        gap = bootstrap_difference(predictions[name], predictions[best], y)
        if name == best or gap["no_difference"]:
            return name, best
    return best, best


def g2_decision(model_metrics, crowd_metrics, calibration_rows, leak_free=True):
    """Gate G2 from the master plan §9.2, applied mechanically."""
    checked = [row for row in calibration_rows if row["count"] >= 20]
    calibrated = all(abs(row["mean_forecast"] - row["yes_rate"]) <= 0.10 for row in checked)
    beats_coin = model_metrics["brier"] < 0.25
    near_crowd = model_metrics["brier"] - crowd_metrics["brier"] <= 0.01
    if not leak_free or not beats_coin:
        level = "C"
    elif near_crowd and calibrated:
        level = "A"
    else:
        level = "B"
    return {
        "leak_free": leak_free,
        "brier_below_coin_flip": beats_coin,
        "within_0.01_of_crowd": near_crowd,
        "calibrated_within_0.10": calibrated,
        "calibration_buckets_checked": len(checked),
        "level": level,
    }


def describe_model(model, name):
    """Coefficients of a logistic model, readable: which way each feature pushes."""
    if name == "hgb":
        return None
    names = model.named_steps["features"].get_feature_names_out()
    coefs = model.named_steps["model"].coef_[0]
    return {
        "intercept": round(float(model.named_steps["model"].intercept_[0]), 4),
        "coefficients": {n.split("__", 1)[1]: round(float(c), 4) for n, c in zip(names, coefs)},
    }


def validation_run(table):
    train = table[table["split"] == "train"]
    validation = table[table["split"] == "validation"]
    y = validation["y"].to_numpy()

    crowd = np.clip(validation["crowd"].to_numpy(), *CLIP)
    results = {"crowd (B1 baseline)": metrics(crowd, y)}
    predictions, tuning = {}, {}
    for name in CANDIDATES:
        C = None
        if name != "hgb":
            C, tuning[name] = tune_c(CANDIDATES[name], train)
        model = fit(name, train, C)
        predictions[name] = predict(model, validation)
        results[name] = {**metrics(predictions[name], y), "C": C}

    chosen, best = choose(results, y, predictions)
    report = {
        "split_sizes": {s: int((table["split"] == s).sum()) for s in ["train", "validation", "test"]},
        "validation": results,
        "vs_crowd": {name: bootstrap_difference(predictions[name], crowd, y) for name in CANDIDATES},
        "lowest_brier": best,
        "chosen": chosen,
        "chosen_C": results[chosen]["C"],
        "cv_tuning_brier_by_C": tuning,
        "chosen_model_on_train": describe_model(fit(chosen, train, results[chosen]["C"]), chosen),
        "validation_calibration": {"crowd": calibration(crowd, y), **{name: calibration(predictions[name], y) for name in CANDIDATES}},
        "override": None,
    }
    return report


def test_run(table, validation_report):
    """Refit the chosen model on train + validation, score the test split once."""
    chosen, C = validation_report["chosen"], validation_report["chosen_C"]
    seen = table[table["split"].isin(["train", "validation"])]
    test = table[table["split"] == "test"]
    y = test["y"].to_numpy()

    model = fit(chosen, seen, C)
    p = predict(model, test)
    crowd = np.clip(test["crowd"].to_numpy(), *CLIP)
    model_metrics, crowd_metrics = metrics(p, y), metrics(crowd, y)
    rows = calibration(p, y)
    report = {
        "model": chosen,
        "C": C,
        "chosen_by": validation_report.get("override") or "the pre-set rule in this file",
        "trained_on": "train + validation",
        "test": {"model": model_metrics, "crowd": crowd_metrics, "coin_flip": metrics(np.full(len(y), 0.5), y)},
        "model_minus_crowd": bootstrap_difference(p, crowd, y),
        "calibration": {"model": rows, "crowd": calibration(crowd, y)},
        "per_category": {
            cat: {"n": int(len(g)), "model": round(brier(p[g.index], y[g.index]), 4), "crowd": round(brier(crowd[g.index], y[g.index]), 4)}
            for cat, g in test.reset_index(drop=True).groupby("category")
        },
        "g2": g2_decision(model_metrics, crowd_metrics, rows),
        "coefficients": describe_model(model, chosen),
    }
    return report


def plot_calibration(rows_by_name, path, title):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(4.6, 4.6), dpi=150)
    ax.plot([0, 1], [0, 1], color="#9ca3af", linewidth=1, linestyle="--", label="perfect")
    styles = {"crowd": ("#1d4ed8", "o"), "AI": ("#6d28d9", "s")}
    for name, rows in rows_by_name.items():
        color, marker = styles.get(name, ("#6d28d9", "s"))
        pts = [(r["mean_forecast"], r["yes_rate"]) for r in rows if r["count"]]
        if pts:
            xs, ys = zip(*pts)
            ax.plot(xs, ys, color=color, marker=marker, linewidth=1.4, label=name)
    ax.set_xlabel("forecast probability")
    ax.set_ylabel("share that resolved YES")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title(title, fontsize=10)
    ax.legend(frameon=False, fontsize=8)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def draw_test_chart(report, figures):
    plot_calibration(
        {"crowd": report["calibration"]["crowd"], "AI": report["calibration"]["model"]},
        figures / "test-calibration.png",
        f"Test calibration: crowd vs AI ({report['test']['model']['n']} markets)",
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--test", action="store_true", help="the one-time test evaluation (gate G2)")
    parser.add_argument("--choose", choices=list(CANDIDATES), help="override the rule's choice, BEFORE the test run")
    parser.add_argument("--reason", help="why the rule is overridden; stored in reports/validation.json")
    parser.add_argument("--replot", action="store_true", help="redraw the test chart from the saved results; scores nothing")
    args = parser.parse_args(argv)

    if args.replot:
        report = json.loads((config.REPORTS_DIR / "evaluation.json").read_text(encoding="utf-8"))
        draw_test_chart(report, config.REPORTS_DIR / "figures")
        return

    if args.choose:
        # A human decision, written down before the test split is touched
        if (config.REPORTS_DIR / "evaluation.json").exists():
            print("The test split has already been used; the choice can't change any more.")
            return 1
        if not args.reason:
            print("Give a --reason: it goes into the report next to the choice.")
            return 1
        path = config.REPORTS_DIR / "validation.json"
        report = json.loads(path.read_text(encoding="utf-8"))
        report["override"] = {"rule_chose": report["chosen"], "chosen": args.choose, "reason": args.reason}
        report["chosen"] = args.choose
        report["chosen_C"] = report["validation"][args.choose]["C"]
        path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Chosen for the test run: {args.choose} (the rule chose {report['override']['rule_chose']}).")
        return

    table = pd.read_csv(config.INTERIM_DIR / "features.csv")
    figures = config.REPORTS_DIR / "figures"

    if not args.test:
        report = validation_run(table)
        (config.REPORTS_DIR / "validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        chosen = report["chosen"]
        plot_calibration(
            {"crowd": report["validation_calibration"]["crowd"], "AI": report["validation_calibration"][chosen]},
            figures / "validation-calibration.png",
            "Validation calibration: crowd vs AI",
        )
        for name, values in report["validation"].items():
            print(f"{name:<22} {values}")
        for name, gap in report["vs_crowd"].items():
            print(f"{name:<22} minus crowd: {gap}")
        print("lowest Brier:", report["lowest_brier"], "| chosen:", chosen, "| C:", report["chosen_C"])
        print("Run `python -m src.train --test` once, when you are ready to decide G2.")
        return

    out = config.REPORTS_DIR / "evaluation.json"
    if out.exists():
        print(f"{out.relative_to(config.ML_DIR)} already exists: the test split has been used. Not running again.")
        return 1
    validation_report = json.loads((config.REPORTS_DIR / "validation.json").read_text(encoding="utf-8"))
    report = test_run(table, validation_report)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    draw_test_chart(report, figures)
    print(json.dumps({k: report[k] for k in ["model", "test", "model_minus_crowd", "g2"]}, indent=2))


if __name__ == "__main__":
    sys.exit(main())
