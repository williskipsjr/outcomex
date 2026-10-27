import { Link } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import ProbabilityBar from "../../components/ProbabilityBar.jsx";
import { formatDate, formatPercent, formatTimeLeft, formatVolume } from "../../lib/format.js";
import "./MarketCard.css";

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Z"
      />
    </svg>
  );
}

// variant: "blind" | "revealed" | "called" (from getCardVariant) or "practice"
// call is the user's saved call for this market, or null
export default function MarketCard({ market, variant, call = null }) {
  const isPractice = variant === "practice";
  const href = isPractice ? `/practice/${market.id}` : `/market/${market.id}`;

  return (
    <article className="market-card">
      <div className="market-card__top">
        {market.imageUrl ? (
          <img
            className="market-card__image"
            src={market.imageUrl}
            alt=""
            width="40"
            height="40"
            loading="lazy"
          />
        ) : (
          <span className="market-card__image market-card__image--empty" aria-hidden="true">
            {market.category.charAt(0)}
          </span>
        )}
        <Badge label={market.category} />
      </div>

      <h3 className="market-card__question">
        {/* The link covers the whole card (see ::after in the CSS) */}
        <Link to={href} className="market-card__link">
          {market.question}
        </Link>
      </h3>

      <div className="market-card__probability">
        {variant === "blind" && (
          <p className="market-card__locked">
            <LockIcon />
            Call it to reveal
          </p>
        )}

        {/* Practice cards never show a price or outcome: that would give the answer away */}
        {isPractice && <p className="market-card__locked">Resolved · make your call</p>}

        {(variant === "revealed" || variant === "called") &&
          (market.crowdProbability === null ? (
            <p className="market-card__locked">No price yet</p>
          ) : (
            <ProbabilityBar who="crowd" label="Crowd" value={market.crowdProbability} />
          ))}

        {variant === "called" && (
          <Badge tone="you" label={`Your call ${formatPercent(call.probability)}`} />
        )}
      </div>

      <footer className="market-card__meta">
        {isPractice ? (
          <>
            <span>Closed {formatDate(market.closedDate)}</span>
            <span>As of {formatDate(market.asOfDate)}</span>
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
