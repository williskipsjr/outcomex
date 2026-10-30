import { Link } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import Sparkline from "../../components/Sparkline.jsx";
import { formatDate, formatPercent, formatTimeLeft, formatVolume } from "../../lib/format.js";
import { accuracyFromBrier, brierScore } from "../../lib/scoring.js";
import { getMarketChange } from "../../lib/sparkline.js";
import "./MarketCard.css";

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Z"
      />
    </svg>
  );
}

// "▲ 4.9" in green or "▼ 2.0" in red. The words for screen readers say it in full.
function PriceChange({ change }) {
  if (change === null || change === 0) return null;
  const up = change > 0;
  return (
    <span className={`market-card__change market-card__change--${up ? "up" : "down"} num`}>
      <span aria-hidden="true">{up ? "▲" : "▼"} </span>
      <span className="visually-hidden">{up ? "up" : "down"} </span>
      {Math.abs(change)}
      <span className="visually-hidden"> points this week</span>
    </span>
  );
}

// variant: "blind" | "revealed" | "called" (from getCardVariant) or "practice"
// call is the user's saved call for this market, or null
export default function MarketCard({ market, variant, call = null }) {
  const isPractice = variant === "practice";
  const showsCrowd = variant === "revealed" || variant === "called";
  const href = isPractice ? `/practice/${market.id}` : `/market/${market.id}`;

  return (
    <article className="market-card">
      <div className="market-card__head">
        {market.imageUrl ? (
          <img
            className="market-card__image"
            src={market.imageUrl}
            alt=""
            width="48"
            height="48"
            loading="lazy"
          />
        ) : (
          <span className="market-card__image market-card__image--empty" aria-hidden="true">
            {market.category.charAt(0)}
          </span>
        )}
        <div className="market-card__titles">
          <p className="market-card__category">{market.category}</p>
          <h3 className="market-card__question">
            {/* The link covers the whole card (see ::after in the CSS) */}
            <Link to={href} className="market-card__link">
              {market.question}
            </Link>
          </h3>
        </div>
      </div>

      <div className="market-card__body">
        {/* Blind and practice cards never show a number: that would give the answer away */}
        {variant === "blind" && (
          <div className="market-card__hidden">
            <LockIcon />
            <span>Call it to reveal</span>
          </div>
        )}

        {/* A practice market you've done: the answer is no secret any more */}
        {isPractice && call?.resolution && (
          <div className="market-card__hidden market-card__hidden--practice">
            <span className="market-card__rewind">Resolved {call.resolution.outcome}</span>
            <span className="num">
              Your call {formatPercent(call.probability)} · accuracy{" "}
              {accuracyFromBrier(brierScore(call.probability, call.resolution.outcome))}
            </span>
          </div>
        )}

        {isPractice && !call && (
          <div className="market-card__hidden market-card__hidden--practice">
            <span className="market-card__rewind">Rewind to {formatDate(market.asOfDate)}</span>
            <span>Make your call</span>
          </div>
        )}

        {showsCrowd &&
          (market.crowdProbability === null ? (
            <div className="market-card__hidden">No price yet</div>
          ) : (
            <>
              <div className="market-card__price">
                <span className="market-card__chance">
                  <strong className="num">{formatPercent(market.crowdProbability)}</strong> chance
                </span>
                <PriceChange change={getMarketChange(market)} />
              </div>
              <Sparkline prices={market.sparkline} who="crowd" />
            </>
          ))}

        {variant === "called" && (
          <Badge tone="you" label={`Your call ${formatPercent(call.probability)}`} />
        )}
      </div>

      <footer className="market-card__meta">
        {isPractice ? (
          <>
            <span>Closed {formatDate(market.closedDate)}</span>
            <span>Resolved</span>
          </>
        ) : (
          <>
            <span className="num">{formatVolume(market.volume)} vol</span>
            <span>{formatTimeLeft(market.endDate)}</span>
          </>
        )}
      </footer>
    </article>
  );
}
