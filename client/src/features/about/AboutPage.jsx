import { accuracyFromBrier, brierScore, MIN_CALLS_FOR_SUMMARY } from "../../lib/scoring.js";
import "./AboutPage.css";

// The worked example runs through the same functions as My Calls, so the
// numbers on this page can never disagree with the app's own scoring
const EXAMPLE_OUTCOME = "YES";
const EXAMPLE_FORECASTS = [
  { who: "You", probability: 0.7 },
  { who: "Crowd", probability: 0.4 },
  { who: "Always 50%", probability: 0.5 },
];

function ScoringExample() {
  const happened = EXAMPLE_OUTCOME === "YES" ? 1 : 0;
  return (
    <table className="about__table">
      <caption>A market that resolved {EXAMPLE_OUTCOME}</caption>
      <thead>
        <tr>
          <th scope="col">Forecast</th>
          <th scope="col">Probability of YES</th>
          <th scope="col">Brier score</th>
          <th scope="col">Accuracy</th>
        </tr>
      </thead>
      <tbody>
        {EXAMPLE_FORECASTS.map(({ who, probability }) => {
          const brier = brierScore(probability, EXAMPLE_OUTCOME);
          return (
            <tr key={who}>
              <th scope="row">{who}</th>
              <td className="num">{Math.round(probability * 100)}%</td>
              <td className="num">
                ({probability.toFixed(2)} − {happened})² = {brier.toFixed(2)}
              </td>
              <td className="num">{accuracyFromBrier(brier)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Sections follow the master plan's S6 screen: how it works, scoring, data
// sources, the AI layer and its track record, disclaimers.
export default function AboutPage() {
  return (
    <article className="about">
      <header className="about__hero">
        <p className="about__eyebrow">About OutcomeX</p>
        <h1 className="about__title">Make your call before you see the crowd</h1>
        <p className="about__lede">
          OutcomeX is a place to practise forecasting on real prediction-market questions. You
          say how likely something is, then compare your number with the crowd's price and an AI
          estimate, and you get a score once the answer is known.
        </p>
      </header>

      <section className="about__section" aria-labelledby="about-how">
        <h2 id="about-how">How it works</h2>
        <ol className="about__steps">
          <li>
            <strong>Pick a question.</strong> Every live market is a real Polymarket question,
            such as "Will this team win on Sunday?"
          </li>
          <li>
            <strong>Make your call, blind.</strong> Blind mode is on by default, so the crowd's
            price, the AI and the chart stay hidden. You choose a probability from 1% to 99%, and
            then it's locked.
          </li>
          <li>
            <strong>See the reveal.</strong> Your number appears next to the crowd's and the
            AI's: You vs Crowd vs AI.
          </li>
          <li>
            <strong>Get scored.</strong> When a live market resolves, My Calls scores your call.
            Practice questions are already answered, so those are scored straight away.
          </li>
        </ol>
      </section>

      <section className="about__section" aria-labelledby="about-scoring">
        <h2 id="about-scoring">How you're scored</h2>
        <p>
          Every call gets a <strong>Brier score</strong>: the square of how far your probability
          was from what happened, counting YES as 1 and NO as 0. 0 is perfect, 1 is the worst, and
          saying 50% every time scores 0.25. <strong>Lower is better.</strong>
        </p>
        <p>
          Next to it we show <strong>accuracy</strong>, which is 100 × (1 − Brier), rounded. It's
          easier to read, but it's always shown with the Brier score, never instead of it.
        </p>
        <ScoringExample />
        <p>
          Being confident and right scores well; being confident and wrong costs a lot. My Calls
          only shows your averages once you have {MIN_CALLS_FOR_SUMMARY} resolved calls, because
          fewer than that says more about luck than skill.
        </p>
      </section>
    </article>
  );
}
