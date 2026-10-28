import ErrorState from "../../components/ErrorState.jsx";
import Spinner from "../../components/Spinner.jsx";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { getCardVariant } from "./cardVariant.js";
import MarketCard from "./MarketCard.jsx";
import MarketGrid from "./MarketGrid.jsx";
import "./RemoteResults.css";

// The "More from Polymarket" section under the local results. It has its own
// loading and error states, so a failed search never hides the local cards.
export default function RemoteResults({ status, markets, error, onRetry, blindMode, getCall }) {
  return (
    <section className="remote-results" aria-labelledby="remote-results-title">
      <h2 id="remote-results-title" className="remote-results__title">
        More from Polymarket
      </h2>

      {status === "loading" && !markets && (
        <p className="remote-results__status">
          <Spinner size="small" label="Searching Polymarket" />
          Searching Polymarket…
        </p>
      )}

      {status === "error" && (
        <ErrorState
          title="Search didn't work"
          message={getErrorMessage(error)}
          onRetry={onRetry}
        />
      )}

      {markets && markets.length === 0 && status === "success" && (
        <p className="remote-results__status">Nothing else on Polymarket matches that.</p>
      )}

      {markets && markets.length > 0 && (
        <MarketGrid busy={status === "loading"}>
          {markets.map((market) => {
            const call = getCall(market.id);
            return (
              <MarketCard
                key={market.id}
                market={market}
                call={call}
                variant={getCardVariant({ blindMode, call })}
              />
            );
          })}
        </MarketGrid>
      )}
    </section>
  );
}
