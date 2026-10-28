import MarketCards from "./MarketCards.jsx";
import MarketGrid from "./MarketGrid.jsx";
import "./MarketRow.css";

// A titled section of a few cards, like "Closing soon" on the home page
export default function MarketRow({ title, markets, blindMode, getCall }) {
  if (markets.length === 0) return null;
  const headingId = `row-${title.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <section className="market-row" aria-labelledby={headingId}>
      <h2 id={headingId} className="market-row__title">
        {title}
      </h2>
      <MarketGrid>
        <MarketCards markets={markets} blindMode={blindMode} getCall={getCall} />
      </MarketGrid>
    </section>
  );
}
