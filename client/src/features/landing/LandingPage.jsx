import { Link } from "react-router-dom";
import { CATEGORIES } from "../../data/index.js";
import { MAX_REASON_LENGTH } from "../calls/callsStorage.js";
import useReveal from "./useReveal.js";
import "./LandingPage.css";

// The welcome page at /welcome: what OutcomeX is, for someone who hasn't used
// it yet. It sits outside the app's nav bar and footer (see App.jsx) and every
// button leads to a real page or a section of this one. The dashboard stays
// at /, so no existing link changes.

const REPO_URL = "https://github.com/williskipsjr/outcomex";
const EVALUATION_URL = `${REPO_URL}/blob/main/docs/ml/evaluation.md`;

const STEPS = [
  {
    title: "Explore real questions",
    text: "Browse live yes/no markets from Polymarket by category, search for a topic, or start with what closes soon.",
  },
  {
    title: "Make your call",
    text: `Enter the probability you believe, from 1 to 99%, with an optional reason of up to ${MAX_REASON_LENGTH} characters. Calls are locked once made, and with blind mode on you make yours before seeing anything else.`,
  },
  {
    title: "Compare with the crowd and the AI",
    text: "Your number, the crowd's price and the AI's estimate appear side by side, with the biggest difference spelled out.",
  },
  {
    title: "Get scored",
    text: "When the question resolves, every forecast gets a Brier score. My Calls shows whether you beat the crowd.",
  },
];

// From the one-time G2 test (docs/ml/feasibility.md and docs/ml/evaluation.md).
// Fixed past results, the same figures the About page shows.
const STATS = [
  {
    tag: "Data check",
    value: "830",
    text: "resolved markets passed the data check, with 0 wrong labels in 30 checked by hand",
  },
  {
    tag: "Test set",
    value: "117",
    text: "held-out markets, used once to test the AI a week before each one ended",
  },
  {
    tag: "Result",
    value: "0.089",
    text: "Brier score for the AI and the crowd alike. The AI ties the crowd, it doesn't beat it",
  },
  {
    tag: "Coverage",
    value: String(CATEGORIES.length),
    text: `categories to browse, such as ${CATEGORIES.slice(0, 3).join(", ").toLowerCase()}`,
  },
];

function Logo() {
  return (
    <span className="landing-logo">
      <svg className="landing-logo__mark" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2.2" className="landing-logo__dot" />
      </svg>
      OutcomeX
    </span>
  );
}

function Arrow() {
  return (
    <span className="landing-btn__arrow" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path d="M4 12L12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

// The slowly turning ring of words in the hero. Decoration only.
function Badge() {
  return (
    <div className="landing-badge" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="landing-badge__ring">
        <defs>
          <path id="landing-badge-path" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1 -92 0" />
        </defs>
        <text>
          <textPath href="#landing-badge-path" textLength="286" lengthAdjust="spacing">
            CALL IT BLIND · SEE THE CROWD · GET SCORED ·
          </textPath>
        </text>
      </svg>
      <svg viewBox="0 0 24 24" className="landing-badge__star">
        <path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z" />
      </svg>
    </div>
  );
}

// The You vs Crowd vs AI bars on the feature card: shapes only, no numbers,
// so it can't be mistaken for a real market
function CompareSketch() {
  return (
    <div className="landing-sketch" aria-hidden="true">
      {["You", "Crowd", "AI"].map((who, index) => (
        <div key={who} className={`landing-sketch__row landing-sketch__row--${index}`}>
          <span>{who}</span>
          <span className="landing-sketch__track">
            <span className="landing-sketch__fill" />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const ref = useReveal();

  return (
    <div className="landing" ref={ref}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="landing-nav">
        <Link to="/welcome" className="landing-nav__brand" aria-label="OutcomeX, welcome page">
          <Logo />
        </Link>
        <nav aria-label="Welcome page">
          <ul className="landing-nav__links">
            <li>
              <Link to="/">Explore</Link>
            </li>
            <li>
              <a href="#how">How it works</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
          </ul>
        </nav>
        <Link to="/" className="landing-btn landing-btn--small">
          Open the app
          <Arrow />
        </Link>
      </header>

      <main id="main" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__arc" aria-hidden="true" />
          <div className="landing-hero__inner">
            <p className="landing-eyebrow landing-rise">Blind forecasting on live markets</p>
            <h1 id="landing-title" className="landing-hero__title landing-rise">
              Think beyond <br />
              the crowd.
            </h1>
            <p className="landing-hero__lede landing-rise">
              Make your own call on real-world questions before you see a single price. Then compare
              it with the crowd and an AI estimate, and find out who forecasts best when the
              question resolves.
            </p>
            <div className="landing-hero__actions landing-rise">
              <Link to="/" className="landing-btn">
                Explore markets
                <Arrow />
              </Link>
              <a href="#how" className="landing-btn landing-btn--ghost">
                See how it works
              </a>
            </div>
          </div>
          <Badge />
          <ul className="landing-hero__facts">
            <li>Data from Polymarket</li>
            <li>Scored with the Brier score</li>
            <li>No money, ever</li>
          </ul>
        </section>

        <section className="landing-intro" aria-labelledby="landing-intro-title">
          <div className="landing-intro__grid">
            <div data-reveal>
              <p className="landing-eyebrow landing-eyebrow--dark">What OutcomeX is</p>
              <h2 id="landing-intro-title" className="landing-intro__title">
                Your call first. <br />
                Then everyone else's.
              </h2>
            </div>
            <div className="landing-intro__copy" data-reveal>
              <p>
                OutcomeX shows live yes/no questions on politics, sport, crypto and more. You say
                how likely you think each one is. Blind mode is on by default, so the crowd's price,
                the AI's estimate and the chart stay hidden until your number is in.{" "}
                <span className="landing-intro__fade">
                  Most forecasts quietly lean on what everyone else already thinks. Calling blind
                  shows what your own judgement is worth, and the Brier score treats you, the crowd
                  and the AI by exactly the same rule.
                </span>
              </p>
              <dl className="landing-intro__cells">
                <div>
                  <dt>1–99%</dt>
                  <dd>Any whole percentage you believe in</dd>
                </div>
                <div>
                  <dt>3</dt>
                  <dd>Numbers side by side after you call: you, the crowd, the AI</dd>
                </div>
              </dl>
            </div>
          </div>
          <p className="landing-intro__keys" data-reveal>
            Works from the keyboard too
            <kbd>Tab</kbd>
            <kbd>↵</kbd>
          </p>
        </section>

        <section id="how" className="landing-how" aria-labelledby="landing-how-title">
          <h2 id="landing-how-title" className="landing-section-title" data-reveal>
            How it works
          </h2>
          <p className="landing-how__sub" data-reveal>
            Four steps, the same for every question.
          </p>
          <ol className="landing-steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="landing-step" data-reveal>
                <span className="landing-step__number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="landing-step__title">{step.title}</h3>
                  <p className="landing-step__text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="landing-how__more" data-reveal>
            Want the maths?
            <Link to="/about" className="landing-btn landing-btn--small landing-btn--outline">
              How you're scored
              <Arrow />
            </Link>
          </p>
        </section>

        <section
          id="features"
          className="landing-features"
          aria-labelledby="landing-features-title"
        >
          <div className="landing-features__head" data-reveal>
            <p className="landing-eyebrow landing-eyebrow--dark">Features</p>
            <h2
              id="landing-features-title"
              className="landing-section-title landing-section-title--dark"
            >
              Everything you need to <br />
              test your judgement.
            </h2>
          </div>
          <div className="landing-bento">
            <article className="landing-card landing-card--light" data-reveal>
              <h3>Live markets</h3>
              <p>
                Questions and prices straight from Polymarket, refreshed every minute while the page
                is open.
              </p>
              <Link to="/" className="landing-card__link">
                Browse live markets <Arrow />
              </Link>
            </article>
            <article className="landing-card landing-card--glow landing-card--wide" data-reveal>
              <h3>Blind mode</h3>
              <p>
                On by default. The crowd's numbers stay hidden on every market you haven't called
                yet, so nothing nudges your first instinct. Switch it off in the top bar whenever
                you like.
              </p>
              <div className="landing-blind" aria-hidden="true">
                <span className="landing-blind__bar" />
                <span className="landing-blind__label">Call it to reveal</span>
              </div>
            </article>
            <article className="landing-card landing-card--wide" data-reveal>
              <h3>You vs Crowd vs AI</h3>
              <p>
                After you call, three bars side by side. The AI is the crowd's price, gently
                recalibrated: it doesn't read the news, and it only gives a number for markets
                ending within 21 days.
              </p>
              <CompareSketch />
            </article>
            <article className="landing-card landing-card--light" data-reveal>
              <h3>Price history</h3>
              <p>
                See how the crowd's price moved over the last day, week, month or all time. With
                blind mode on, the chart appears once you've called.
              </p>
              <svg className="landing-chart" viewBox="0 0 200 60" aria-hidden="true">
                <path d="M0 46 L22 40 L40 44 L62 30 L84 34 L104 22 L126 28 L148 14 L170 20 L200 8" />
              </svg>
            </article>
            <article className="landing-card landing-card--half" data-reveal>
              <h3>Practice mode</h3>
              <p>
                Rewind to markets that have already resolved, shown as they looked a week before the
                end. Call them and get your score straight away.
              </p>
              <Link to="/practice" className="landing-card__link">
                Start practising <Arrow />
              </Link>
            </article>
            <article className="landing-card landing-card--light landing-card--half" data-reveal>
              <h3>My Calls</h3>
              <p>
                Every call you've made, scored as its question resolves. After five resolved calls
                you see whether you beat the crowd and the AI on the same questions.
              </p>
              <Link to="/me" className="landing-card__link">
                Open My Calls <Arrow />
              </Link>
            </article>
          </div>
        </section>

        <section className="landing-stats" aria-labelledby="landing-stats-title">
          <div className="landing-stats__head" data-reveal>
            <h2
              id="landing-stats-title"
              className="landing-section-title landing-section-title--dark"
            >
              Not just any number. <br />
              Ones you can check.
            </h2>
            <p>
              The figures below come from the project's own data check and the one-time test of the
              AI, written up before any result was known.
            </p>
            <a
              href={EVALUATION_URL}
              target="_blank"
              rel="noreferrer"
              className="landing-btn landing-btn--small landing-btn--dark"
            >
              Read the evaluation
              <span className="visually-hidden"> (opens on GitHub in a new tab)</span>
              <Arrow />
            </a>
          </div>
          <ul className="landing-stats__grid">
            {STATS.map((stat) => (
              <li key={stat.tag} className="landing-stat" data-reveal>
                <span className="landing-stat__tag">{stat.tag}</span>
                <p className="landing-stat__value num">{stat.value}</p>
                <p className="landing-stat__text">{stat.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-cta__card" data-reveal>
            <h2 id="landing-cta-title" className="landing-cta__title">
              Make your call. <br />
              Own your conviction.
            </h2>
            <p>No sign-up and no money. Your calls stay in your own browser.</p>
            <div className="landing-hero__actions">
              <Link to="/" className="landing-btn">
                Explore OutcomeX
                <Arrow />
              </Link>
              <Link to="/practice" className="landing-btn landing-btn--ghost">
                Try a practice call
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__top">
          <div>
            <Logo />
            <p className="landing-footer__tagline">Forecast blind. Compare honestly.</p>
          </div>
          <nav aria-label="Footer">
            <ul className="landing-footer__links">
              <li>
                <Link to="/">Live markets</Link>
              </li>
              <li>
                <Link to="/practice">Practice</Link>
              </li>
              <li>
                <Link to="/me">My Calls</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  Source code
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="landing-footer__small">
          Market data from{" "}
          <a href="https://polymarket.com" target="_blank" rel="noreferrer">
            Polymarket
          </a>
          . OutcomeX only reads public data: there is no buying, selling or betting here, and
          nothing on this site is financial advice. A Full Stack Development 1 course project, IIIT
          Dharwad.
        </p>
      </footer>
    </div>
  );
}
