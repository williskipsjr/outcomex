import { getCardVariant } from "./cardVariant.js";
import MarketCard from "./MarketCard.jsx";

// Turns a list of markets into cards, each with the right variant. Shared by
// the main grid, the home page rows and the remote search results.
export default function MarketCards({ markets, blindMode, getCall }) {
  return markets.map((market) => {
    const call = getCall(market.id);
    return (
      <MarketCard
        key={market.id}
        market={market}
        call={call}
        variant={getCardVariant({ blindMode, call })}
      />
    );
  });
}
