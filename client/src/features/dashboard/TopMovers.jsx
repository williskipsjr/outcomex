import { Link } from "react-router-dom";
import { formatPercent } from "../../lib/format.js";
import "./TopMovers.css";

// A strip of the week's biggest price moves. The dashboard only shows it
// when blind mode is off, because every item is a crowd number.
// movers: [{ market, change }] from getTopMovers()
export default function TopMovers({ movers }) {
  if (movers.length === 0) return null;

  return (
    <section className="top-movers" aria-label="Top movers this week">
      <h2 className="top-movers__title">Top movers</h2>
      <ul className="top-movers__list">
        {movers.map(({ market, change }) => (
          <li key={market.id}>
            <Link className="top-movers__item" to={`/market/${market.id}`}>
              <span className="top-movers__question">{market.question}</span>
              <span className="num">{formatPercent(market.crowdProbability)}</span>
              <span className={`top-movers__change top-movers__change--${change > 0 ? "up" : "down"} num`}>
                {change > 0 ? "▲" : "▼"} {Math.abs(change)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
