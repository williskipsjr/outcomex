import ErrorState from "../../components/ErrorState.jsx";
import Spinner from "../../components/Spinner.jsx";
import { getErrorMessage } from "../../lib/errorMessages.js";
import MarketCards from "./MarketCards.jsx";
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

      {/* "idle" too: for a moment before the debounced search starts */}
      {(status === "idle" || status === "loading") && !markets && (
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

      {/* On error, hide the old results: they belong to an earlier query */}
      {markets && markets.length > 0 && status !== "error" && (
        <MarketGrid busy={status === "loading"}>
          <MarketCards markets={markets} blindMode={blindMode} getCall={getCall} />
        </MarketGrid>
      )}
    </section>
  );
}
