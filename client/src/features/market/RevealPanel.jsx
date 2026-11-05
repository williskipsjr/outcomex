import Button from "../../components/Button.jsx";
import ProbabilityBar from "../../components/ProbabilityBar.jsx";
import Spinner from "../../components/Spinner.jsx";
import { formatDate } from "../../lib/format.js";
import { describeDifference } from "../../lib/reveal.js";
import { accuracyFromBrier, brierScore } from "../../lib/scoring.js";
import "./RevealPanel.css";

// The reveal shown after you call: your number, the crowd's and the AI's, side
// by side. Used on live and practice markets. When the outcome is known each
// row also gets its Brier score.

// One score line under a row, only when the outcome is known (practice, resolved)
function Score({ probability, outcome }) {
  if (!outcome || probability === null || probability === undefined) return null;
  const brier = brierScore(probability, outcome);
  return (
    <p className="reveal__score num">
      Brier {brier.toFixed(3)} · accuracy {accuracyFromBrier(brier)}
    </p>
  );
}

// The AI row has several states: loading, failed, a model number, signals only, or none
function AiRow({ ai, outcome }) {
  if (ai.status === "idle" || ai.status === "loading") {
    return (
      <p className="reveal__ai-note">
        <Spinner size="small" label="Loading the AI estimate" /> Loading the AI estimate…
      </p>
    );
  }
  if (ai.status === "error") {
    return (
      <div className="reveal__ai-note">
        <span>Couldn't load the AI estimate.</span>
        <Button variant="ghost" onClick={ai.onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const prediction = ai.prediction;
  if (prediction?.available && prediction.level === "model") {
    return (
      <>
        <ProbabilityBar who="ai" label="AI" value={prediction.probability} />
        <Score probability={prediction.probability} outcome={outcome} />
        {/* Live AI numbers are worked out once, from the crowd's price on that day,
            so say which day: the live crowd price above may have moved since */}
        {prediction.generatedAt && (
          <p className="reveal__meta">
            Estimated on {formatDate(prediction.generatedAt)}, from the crowd's price that day
          </p>
        )}
        {prediction.modelVersion && <p className="reveal__meta">Model: {prediction.modelVersion}</p>}
        {prediction.explanation?.length > 0 && (
          <ul className="reveal__reasons">
            {prediction.explanation.slice(0, 3).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </>
    );
  }
  // Level B fallback: if the model ever fails its evaluation, the ML pipeline
  // writes momentum signals instead of a probability, and they are listed here
  if (prediction?.level === "signal") {
    return (
      <div className="reveal__ai-note reveal__ai-note--stack">
        <span>No AI probability. Signals:</span>
        <ul className="reveal__reasons">
          {prediction.explanation.slice(0, 3).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    );
  }
  // Normal style, not an error: most markets simply have no AI number.
  // missingNote (optional) says why, so it doesn't look like a fault.
  return (
    <p className="reveal__ai-note">
      AI not available for this market.{ai.missingNote && ` ${ai.missingNote}`}
    </p>
  );
}

// you, crowd: probabilities 0-1 (crowd may be null) · ai: { status, prediction, onRetry, missingNote }
// outcome: "YES" | "NO" when known, which adds a Brier score to each row
export default function RevealPanel({ you, crowd, crowdLabel = "Crowd", ai, outcome = null }) {
  // One plain sentence comparing you with the crowd, e.g. "You are 20 points more
  // confident in YES than the crowd."
  const sentence = describeDifference(you, crowd);

  return (
    <section className="reveal" aria-labelledby="reveal-title">
      <h2 id="reveal-title" className="reveal__title">
        You vs Crowd vs AI
      </h2>

      {/* --i staggers the slide-in: each row starts a little after the one before */}
      <div className="reveal__row" style={{ "--i": 0 }}>
        <ProbabilityBar who="you" label="You" value={you} />
        <Score probability={you} outcome={outcome} />
      </div>

      <div className="reveal__row" style={{ "--i": 1 }}>
        {crowd === null ? (
          <p className="reveal__ai-note">{crowdLabel}: no price was available.</p>
        ) : (
          <>
            <ProbabilityBar who="crowd" label={crowdLabel} value={crowd} />
            <Score probability={crowd} outcome={outcome} />
          </>
        )}
      </div>

      <div className="reveal__row" style={{ "--i": 2 }}>
        <AiRow ai={ai} outcome={outcome} />
      </div>

      {sentence && <p className="reveal__sentence">{sentence}</p>}
    </section>
  );
}
