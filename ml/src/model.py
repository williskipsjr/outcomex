"""The model the app shows: exactly the one gate G2 evaluated.

`final_model()` refits the chosen model (reports/validation.json) on
train + validation, which is precisely what `train.py --test` scored. Logistic
regression with lbfgs is deterministic, so the refit is the same model, and
the number on screen matches the published track record.

`explain()` turns one prediction into up to 3 short sentences: how the AI
moved the crowd's price, then the two biggest reasons it moved that way.
"""

import json

import numpy as np
import pandas as pd

from . import config
from .train import describe_model, fit, predict

# Bump when the model is retrained. It is shown in the app and in the reports.
MODEL_VERSION = "lr-full-2026-10-31"

# Reasons smaller than this (in log-odds) aren't worth a sentence
MIN_EFFECT = 0.10


def final_model():
    validation = json.loads((config.REPORTS_DIR / "validation.json").read_text(encoding="utf-8"))
    evaluation = json.loads((config.REPORTS_DIR / "evaluation.json").read_text(encoding="utf-8"))
    name, C = validation["chosen"], validation["chosen_C"]
    if evaluation["model"] != name:
        raise RuntimeError(f"validation.json chose {name} but G2 evaluated {evaluation['model']}")

    table = pd.read_csv(config.INTERIM_DIR / "features.csv")
    seen = table[table["split"].isin(["train", "validation"])]
    model = fit(name, seen, C)
    info = {
        "name": name,
        "C": C,
        "version": MODEL_VERSION,
        "trained_on_markets": int(len(seen)),
        "level": evaluation["g2"]["level"],
        "metrics": {
            "testBrier": evaluation["test"]["model"]["brier"],
            "crowdBrier": evaluation["test"]["crowd"]["brier"],
            "n": evaluation["test"]["model"]["n"],
        },
        "coefficients": describe_model(model, name),
    }
    return model, info


def points(change):
    return round(abs(change) * 100)


def percent(p):
    if p < 0.01:
        return "under 1%"
    if p > 0.99:
        return "over 99%"
    return f"{round(p * 100)}%"


def logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6)
    return float(np.log(p / (1 - p)))


def gap_parts(model, row):
    """Split (AI log-odds - crowd log-odds) into one part per reason. The parts
    add up exactly to the gap, because the model is linear in log-odds:
      AI = intercept + w_crowd * z_crowd + sum(w_i * z_i)
      gap = [intercept + w_crowd * z_crowd - crowd log-odds]   (how the crowd's own price is recalibrated)
            + one part per other input
    """
    frame = pd.DataFrame([row])
    z = model.named_steps["features"].transform(frame)
    z = z.toarray()[0] if hasattr(z, "toarray") else np.asarray(z)[0]
    names = [n.split("__", 1)[1] for n in model.named_steps["features"].get_feature_names_out()]
    weights = dict(zip(names, model.named_steps["model"].coef_[0] * z))
    intercept = float(model.named_steps["model"].intercept_[0])
    crowd_logit = logit(min(max(row["crowd"], 0.01), 0.99))

    parts = {
        "recalibration": intercept + weights.pop("crowd_logit") - crowd_logit,
        "category": sum(v for k, v in weights.items() if k.startswith("category_")),
        "move_7d": weights.get("move_7d", 0.0),
        "move_1d": weights.get("move_1d", 0.0),
        "swing": weights.get("volatility_14d", 0.0) + weights.get("range_14d", 0.0),
        "hours": weights.get("hours_since_trade", 0.0),
    }
    ai_logit = float(model.decision_function(frame)[0])
    return parts, ai_logit - crowd_logit


def _reason(name, effect, row):
    up = effect > 0
    if name == "recalibration":
        price = percent(row["crowd"])
        around = price if price.startswith(("under", "over")) else f"around {price}"
        return f"Markets priced {around} have resolved YES {'more' if up else 'less'} often than that"
    if name == "category":
        return f"{row['category']} markets have resolved YES {'more' if up else 'less'} often than their prices suggested"
    if name in ("move_7d", "move_1d"):
        change = row[name]
        span = "7 days" if name == "move_7d" else "day"
        if points(change) < 1:
            return f"The price barely moved in the last {span}"
        return f"The price {'rose' if change > 0 else 'fell'} {points(change)} points in the last {span}"
    if name == "swing":
        if points(row["range_14d"]) < 2:
            return "The price barely moved over the last 14 days"
        return f"The price swung within a {points(row['range_14d'])}-point range over the last 14 days"
    return f"No trades in the last {round(row['hours_since_trade'])} hours"


def explain(model, row):
    """Up to 3 plain sentences: what the AI did to the crowd's price, and why.

    Only reasons that pushed in the direction the AI actually moved are cited,
    so a sentence can never contradict the number next to it.
    """
    parts, gap = gap_parts(model, row)
    ai = 1 / (1 + np.exp(-(logit(min(max(row["crowd"], 0.01), 0.99)) + gap)))
    ai = min(max(ai, 0.01), 0.99)
    if abs(ai - row["crowd"]) < 0.01:
        return [f"The AI agrees with the crowd's price ({percent(row['crowd'])})"]

    verb = "raises" if gap > 0 else "lowers"
    lines = [f"The AI {verb} the crowd's price from {percent(row['crowd'])} to {percent(ai)}"]
    reasons = [(name, effect) for name, effect in parts.items() if (effect > 0) == (gap > 0) and abs(effect) >= MIN_EFFECT]
    reasons.sort(key=lambda item: -abs(item[1]))
    lines += [_reason(name, effect, row) for name, effect in reasons[:2]]
    return lines


def predict_rows(model, rows):
    """rows: DataFrame with the feature columns and category -> probabilities."""
    return predict(model, rows)
