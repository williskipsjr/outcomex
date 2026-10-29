// Scoring for forecasts. Pure functions only: no React, no storage.
// These definitions are shared with the ML engineer and the About page,
// so they must not drift.
//
//   Brier score  (p - o)^2   p = probability given to YES, o = 1 if YES happened else 0
//                0 is perfect, 0.25 = always saying 50%, 1 is the worst. Lower is better.
//   Accuracy     round(100 * (1 - Brier)), a friendlier 0-100 number shown NEXT TO
//                the Brier score, never instead of it.

export const MIN_CALLS_FOR_SUMMARY = 5;

export function brierScore(probability, outcome) {
  const happened = outcome === "YES" ? 1 : 0;
  return (probability - happened) ** 2;
}

export function accuracyFromBrier(brier) {
  return Math.round(100 * (1 - brier));
}

// Average Brier over a list of { probability, outcome }. null when the list
// is empty: "not enough data" must never show up as NaN on screen.
export function meanBrier(forecasts) {
  if (forecasts.length === 0) return null;
  const total = forecasts.reduce((sum, f) => sum + brierScore(f.probability, f.outcome), 0);
  return total / forecasts.length;
}

// You vs Crowd vs AI on the SAME resolved calls, so the comparison is fair.
// The AI only had a number on some calls, so it gets its own subset and n.
export function compareForecasts(calls) {
  const resolved = calls.filter((call) => call.resolution);
  const outcomeOf = (call) => call.resolution.outcome;

  const withCrowd = resolved.filter((call) => call.revealed?.crowdProbability != null);
  const withAi = resolved.filter((call) => call.revealed?.aiProbability != null);

  const summary = (list, pick) => {
    const brier = meanBrier(list.map((call) => ({ probability: pick(call), outcome: outcomeOf(call) })));
    return { n: list.length, brier, accuracy: brier === null ? null : accuracyFromBrier(brier) };
  };

  return {
    you: summary(withCrowd, (call) => call.probability),
    crowd: summary(withCrowd, (call) => call.revealed.crowdProbability),
    ai: summary(withAi, (call) => call.revealed.aiProbability),
    // How you did on the AI's subset, so "you vs AI" also compares like with like
    youOnAiCalls: summary(withAi, (call) => call.probability),
    enoughData: withCrowd.length >= MIN_CALLS_FOR_SUMMARY,
  };
}

// 10 buckets (0-10%, 10-20%, ...): average forecast vs how often YES happened
export function calibrationBuckets(forecasts) {
  const buckets = Array.from({ length: 10 }, (_, index) => ({
    from: index / 10,
    to: (index + 1) / 10,
    count: 0,
    meanForecast: null,
    yesRate: null,
  }));

  const sums = buckets.map(() => ({ forecast: 0, yes: 0 }));
  for (const { probability, outcome } of forecasts) {
    // 1.0 would be bucket 10, which doesn't exist, so cap it at 9
    const index = Math.min(Math.floor(probability * 10), 9);
    buckets[index].count += 1;
    sums[index].forecast += probability;
    sums[index].yes += outcome === "YES" ? 1 : 0;
  }

  return buckets.map((bucket, index) =>
    bucket.count === 0
      ? bucket
      : {
          ...bucket,
          meanForecast: sums[index].forecast / bucket.count,
          yesRate: sums[index].yes / bucket.count,
        },
  );
}
