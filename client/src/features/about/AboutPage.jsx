import { accuracyFromBrier, brierScore, MIN_CALLS_FOR_SUMMARY } from "../../lib/scoring.js";
import DataStatus from "./DataStatus.jsx";
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

// From the one-time G2 test run (docs/ml/evaluation.md, run 2). The test set
// is used once, so these are a fixed past result, not live data.
const TEST_RESULT = {
  n: 117,
  rows: [
    { who: "AI", brier: 0.0891 },
    { who: "Crowd", brier: 0.089 },
    { who: "Always 50%", brier: 0.25 },
  ],
};
// What the recalibration does to a few crowd prices (same doc)
const RECALIBRATION = [
  { crowd: 2, ai: 4 },
  { crowd: 10, ai: 15 },
  { crowd: 30, ai: 35 },
  { crowd: 50, ai: 53 },
  { crowd: 70, ai: 70 },
  { crowd: 90, ai: 88 },
  { crowd: 98, ai: 97 },
];
const REPO_URL = "https://github.com/williskipsjr/outcomex";
const EVALUATION_URL = `${REPO_URL}/blob/main/docs/ml/evaluation.md`;

// Sections follow the master plan's S6 screen. One list feeds both the
// headings and the "On this page" links, so the two can't drift apart.
const SECTIONS = {
  how: { id: "about-how", title: "How it works" },
  scoring: { id: "about-scoring", title: "How you're scored" },
  data: { id: "about-data", title: "Where the data comes from" },
  ai: { id: "about-ai", title: "The AI and its track record" },
  smallPrint: { id: "about-small-print", title: "The small print" },
};

function Section({ id, title, children }) {
  return (
    <section className="about__section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

// The About page (/about): how OutcomeX works, how scoring works (with a worked
// example), where the data comes from (with a live check), what the AI is and
// how it was tested, and the small print.
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
        <nav className="about__toc" aria-label="On this page">
          {Object.values(SECTIONS).map(({ id, title }) => (
            <a key={id} href={`#${id}`}>
              {title}
            </a>
          ))}
        </nav>
      </header>

      <Section {...SECTIONS.how}>
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
      </Section>

      <Section {...SECTIONS.scoring}>
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
      </Section>

      <Section {...SECTIONS.data}>
        <dl className="about__facts">
          <div>
            <dt>Live markets</dt>
            <dd>
              Polymarket's public APIs: questions, prices and search from Gamma, price history from
              CLOB. Your browser asks them directly and refreshes every minute. OutcomeX only reads
              this data.
            </dd>
          </div>
          <div>
            <dt>Practice questions</dt>
            <dd>
              Real Polymarket markets that have already resolved, prepared by our ML pipeline as
              they looked 7 days before their scheduled end. They ship with the app as static
              files.
            </dd>
          </div>
          <div>
            <dt>AI estimates</dt>
            <dd>A static file made offline by our ML pipeline. More on that below.</dd>
          </div>
          <div>
            <dt>Your calls</dt>
            <dd>
              Saved only in this browser. There's no account and no server, so nothing is sent to
              us. You can export them from My Calls; clearing your browser data deletes them.
            </dd>
          </div>
        </dl>
        <p className="about__note">
          <strong>Practice answers are in a public file.</strong> The app only loads it after you
          lock your call, but anyone could read it with the browser's developer tools. That's fine
          for a practice game: the "call first" check is a convenience, not security.
        </p>
        <DataStatus />
      </Section>

      <Section {...SECTIONS.ai}>
        <p>
          The AI is <strong>the crowd's price, gently recalibrated</strong>. It learned from 713
          resolved Polymarket markets how a price a week before the scheduled end relates to
          what actually happened. It pulls very confident prices slightly toward the middle.
        </p>
        <table className="about__table">
          <caption>What the AI does to the crowd's price</caption>
          <tbody>
            <tr>
              <th scope="row">Crowd</th>
              {RECALIBRATION.map(({ crowd }) => (
                <td key={crowd} className="num">
                  {crowd}%
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">AI</th>
              {RECALIBRATION.map(({ crowd, ai }) => (
                <td key={crowd} className="num">
                  {ai}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p>
          We tested it once, on the {TEST_RESULT.n} newest markets it had never seen, scored a
          week before each one's scheduled end:
        </p>
        <table className="about__table">
          <caption>Brier score on {TEST_RESULT.n} held-out markets (lower is better)</caption>
          <tbody>
            {TEST_RESULT.rows.map(({ who, brier }) => (
              <tr key={who}>
                <th scope="row">{who}</th>
                <td className="num">{brier.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <figure className="about__figure">
          {/* Copied from ml/reports/figures/test-calibration.png (690 × 690) */}
          <img
            src="/images/ai-test-calibration.png"
            width="690"
            height="690"
            loading="lazy"
            alt="Line chart of forecast probability against the share of markets that resolved YES, for the crowd and the AI on the 117 test markets. Both lines zigzag around the diagonal and stay close to each other."
          />
          <figcaption>
            Calibration on the test markets: for each forecast range, how often YES really
            happened. Perfect calibration is the dashed diagonal. With only a few markets in each
            range the lines jump around, but the AI (purple) tracks the crowd (blue) closely.
          </figcaption>
        </figure>
        <p>
          <strong>It is as accurate as the crowd, not more.</strong> A week before the end, the
          crowd is hard to beat, and a model that only sees prices doesn't beat it. We show the AI
          as a calibrated second opinion, with this track record next to it.
        </p>
        <ul className="about__list">
          <li>
            It only gives a number for markets that end within 21 days. It was tested a week
            before each market's scheduled end, so we don't trust it on markets that end much
            later. Everywhere else you'll see "AI not available".
          </li>
          <li>
            The numbers are worked out once, from the crowd's price that day, and the reveal says
            which day.
          </li>
          <li>It doesn't read the news, and it doesn't know anything the crowd doesn't.</li>
          <li>
            Our first test run was thrown out because its timing let the outcome leak in. The
            second run used many of the same newest markets, with corrected inputs, and its rules
            were written down before any result was computed.{" "}
            <a href={EVALUATION_URL} target="_blank" rel="noreferrer">
              Read the full evaluation
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section {...SECTIONS.smallPrint}>
        <ul className="about__list">
          <li>
            <strong>No money of any kind.</strong> OutcomeX reads markets, it doesn't run one: there
            is no buying, selling, betting or coins, real or virtual.
          </li>
          <li>
            <strong>Not financial advice.</strong> Every number here is an estimate of how likely
            something is, not a recommendation to do anything.
          </li>
          <li>
            <strong>Not affiliated with Polymarket.</strong> The questions, prices and images are
            Polymarket's public data, and every live market links back to its Polymarket
            page.
          </li>
          <li>
            Practice mode leaves out questions about deaths and tragedies, and violence against
            private people, and a person reads every practice question before it ships.
          </li>
          <li>
            OutcomeX is a student project for Full Stack Development 1 at IIIT Dharwad.{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              See the code on GitHub
            </a>
            .
          </li>
        </ul>
      </Section>
    </article>
  );
}
