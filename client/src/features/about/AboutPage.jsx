import "./AboutPage.css";

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
    </article>
  );
}
