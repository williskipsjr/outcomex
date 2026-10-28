import { useState } from "react";
import { Link } from "react-router-dom";
import Sparkline from "../../components/Sparkline.jsx";
import { formatPercent, formatTimeLeft, formatVolume } from "../../lib/format.js";
import { getPriceChange } from "../../lib/sparkline.js";
import "./FeaturedCarousel.css";

// The big hero at the top of the dashboard: one market at a time, with
// previous/next buttons. No auto-play: moving content the user didn't ask
// for is hard to read and fails accessibility guidelines.
export default function FeaturedCarousel({ markets, blindMode, getCall }) {
  const [index, setIndex] = useState(0);
  if (markets.length === 0) return null;

  // Derived, so the index stays valid even if the list gets shorter
  const current = markets[index % markets.length];
  const showsCrowd = !blindMode || getCall(current.id) !== null;
  const change = getPriceChange(current.sparkline);

  function step(direction) {
    // + markets.length keeps the result positive when going back from 0
    setIndex((value) => (value + direction + markets.length) % markets.length);
  }

  return (
    <section className="featured" aria-roledescription="carousel" aria-label="Featured markets">
      <div className="featured__slide" aria-live="polite">
        <div className="featured__text">
          <p className="featured__category">{current.category}</p>
          <h2 className="featured__question">
            <Link to={`/market/${current.id}`}>{current.question}</Link>
          </h2>

          {showsCrowd ? (
            <>
              <p className="featured__chance">
                <strong className="num">{formatPercent(current.crowdProbability)}</strong> chance
                {change !== null && change !== 0 && (
                  <span className={`featured__change featured__change--${change > 0 ? "up" : "down"} num`}>
                    {change > 0 ? "▲" : "▼"} {Math.abs(change)} this week
                  </span>
                )}
              </p>
              <Sparkline prices={current.sparkline} who="crowd" height={120} />
            </>
          ) : (
            <div className="featured__hidden">
              <p>Blind mode is on: make your own call before you see the crowd.</p>
              <Link className="featured__cta" to={`/market/${current.id}`}>
                Make your call
              </Link>
            </div>
          )}

          <p className="featured__meta">
            <span className="num">{formatVolume(current.volume)} volume</span>
            <span>{formatTimeLeft(current.endDate)}</span>
          </p>
        </div>

        {current.imageUrl && (
          <img className="featured__image" src={current.imageUrl} alt="" width="280" height="280" />
        )}
      </div>

      <div className="featured__controls">
        <button type="button" className="featured__arrow" onClick={() => step(-1)} aria-label="Previous market">
          ‹
        </button>
        <span className="featured__position num">
          {(index % markets.length) + 1} / {markets.length}
        </span>
        <button type="button" className="featured__arrow" onClick={() => step(1)} aria-label="Next market">
          ›
        </button>
      </div>
    </section>
  );
}
