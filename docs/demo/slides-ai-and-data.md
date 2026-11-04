# Demo slides: the AI, and the data layer

Content for the AI segment (three slides, about a minute) and the "why no backend" slide (about a minute with its live demo). Every number comes from `docs/ml/evaluation.md` and `docs/ml/model-card.md`.

Agree with Prathyusha who presents the backend slide.

---

## Slide 1: Is the AI any good? We tested it honestly

**The test**
- 830 resolved Polymarket markets; a random 30 labels checked by hand, 0 wrong
- Split by time: the AI never sees the newest 117 until the test
- Every price is from a week before the scheduled end
- The bar to beat is the crowd, not a coin flip

| Brier score on 117 held-out markets | Lower is better |
|---|---|
| Always 50% | 0.250 |
| Crowd | 0.0890 |
| **AI** | **0.0891** |

**Say:** "It matches the crowd. It doesn't beat it, and we say so on the About page."

---

## Slide 2: Our first test looked fine, and it was wrong

**What happened**
- Run 1 passed the gate. Then live numbers looked impossible: *both* sides of the same race went up
- The cause: we measured prices a week before the *actual* close, and YES markets often close early
- So the timing itself leaked the answer

| Markets priced 5–95% a week before closing | Crowd said | Resolved YES |
|---|---|---|
| Closed on schedule | 42% | 44% |
| Closed early | 38% | **59%** |

**What we did**
- Threw out run 1, using our own rule
- Fixed the timing: a week before the *scheduled* end, known in advance
- Wrote the rules for run 2 *before* computing a number

**Say:** "A result that looks good isn't the same as a result you can trust."

---

## Slide 3: What we shipped, and why

**Level A: a calibrated second opinion**
- The AI is the crowd's price, gently recalibrated: 2% → 4%, 50% → 53%, 98% → 97%
- Why so simple? On validation, none of the more complex models was significantly different from the crowd
- It only shows a number for markets 1–21 days from their scheduled end, close to how it was tested. Otherwise: "AI not available"

**Show:** `ml/reports/figures/crowd-calibration.png`. The crowd is already well calibrated, which is why there's so little to correct.

**Say:** "Our gates could have ended with no AI on screen, and the app was built to handle that."

---

## Slide 4: Why there's no backend

**We checked first:** Polymarket's APIs answer browsers directly, so a server would only add cost and another thing to break.

| A backend would give us | Ours lives in the browser (`client/src/data`) |
|---|---|
| One clean data shape | Normalisers |
| Protection from slow sources | 8-second timeout, one retry |
| Caching and rate-limit safety | TTL cache, shared requests |
| Working through an outage | Saved copy, with a banner |
| One error format | `DataError`, seven codes |

**Then show it live:** go offline → banner. Tamper with a practice call → rejected before the answers file loads. See `runbook-data-and-ml.md`.

**Say:** "Practice answers are in a public file. That check is a convenience, not security, and the About page says so."

---

## Questions you may get

**Why is the crowd the real baseline?** Markets aggregate a lot of information and money. Beating 50% is easy; beating the crowd is the real test.

**What does a Brier score of 0.18 mean?** The average squared distance between forecasts and what happened. 0 is perfect, and always saying 50% scores 0.25, so 0.18 is better than guessing. It rewards being calibrated, where plain accuracy only asks whether you were on the right side of 50%.

**How do you know there's no leakage?** Features use only prices up to the as-of time, and later prices were never downloaded. The as-of time comes from the scheduled end, which is known in advance. Event groups never span splits. There's a test proving later prices can't change a feature. We also got this wrong once, in run 1, and that's documented.

**You re-used the test markets. Isn't that a problem?** It's a real weakness, and we state it. The second run changed every input, and a rule fixed in advance chose the model with no human override, so nothing we saw in run 1 could steer the result. A clean test needs new markets to resolve.

**What happens if the model is worse than the crowd?** The gate gives Level B (signals only) or Level C (no AI). The app already handles all three.

**Why not use the more complex model?** It wasn't significantly better on validation, so the simplest one wins. In run 1, the complex model's edge turned out to be the leak.

**Why did you drop the backend, and what did you check?** On 23 Oct the team confirmed the Gamma and CLOB APIs send `Access-Control-Allow-Origin: *`.

**Walk me through one data call.** Check the input, use a fresh cached copy if there is one, join an identical request already running, fetch with an 8-second timeout and one retry, normalise, store. If the source failed, return a saved copy under 24 hours old with a banner; otherwise give one clear error.

**What would change if practice answers had to be secret?** They'd need a server that only reveals an answer after a call is committed.
