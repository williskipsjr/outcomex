import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { applyView } from "../../lib/filters.js";
import { parseViewParams, toSearchParams } from "../../lib/viewParams.js";
import useSettings from "../settings/useSettings.js";
import { getCardVariant } from "./cardVariant.js";
import DashboardControls from "./DashboardControls.jsx";
import MarketCard from "./MarketCard.jsx";
import MarketGrid from "./MarketGrid.jsx";
import { loadSampleMarkets } from "./sampleMarkets.js";
import "./DashboardPage.css";

const SKELETON_COUNT = 8;

export default function DashboardPage() {
  const { status, data: markets, error, run, retry } = useRequest();
  const { blindMode } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    run((signal) => loadSampleMarkets(signal));
  }, [run]);

  // The URL is the only place the view lives. Everything below is derived
  // from it on every render, so nothing can get out of sync.
  const view = parseViewParams(searchParams, { blindMode });
  // The box shows exactly what was typed (spaces included); filtering uses the trimmed view.q
  const searchText = searchParams.get("q") ?? "";
  const visibleMarkets = markets ? applyView(markets, view) : [];

  // Merge one change into the current view and write it back to the URL.
  // Typing passes { replace: true } so each keystroke doesn't add a history entry.
  function updateView(changes, options) {
    setSearchParams(toSearchParams({ ...view, ...changes }), options);
  }

  function clearView() {
    setSearchParams({});
  }

  // Calls come from FE2's useCalls once it exists; until then nothing is called
  const getCall = () => null;

  function renderContent() {
    // First load: nothing to show yet, so show placeholders in the same grid
    if (!markets && (status === "idle" || status === "loading")) {
      return (
        <MarketGrid busy>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} shape="card" />
          ))}
        </MarketGrid>
      );
    }

    // Failed with nothing loaded before. (If old data exists we keep showing it.)
    if (!markets && status === "error") {
      return (
        <ErrorState
          title="Couldn't load markets"
          message={getErrorMessage(error)}
          onRetry={retry}
        />
      );
    }

    if (markets.length === 0) {
      return (
        <EmptyState
          title="No open markets right now"
          message="Check back in a little while, or try Practice mode."
        />
      );
    }

    if (visibleMarkets.length === 0) {
      return (
        <EmptyState
          title="No markets match"
          message="Try a different search, or turn off some filters."
          action={
            <Button variant="secondary" onClick={clearView}>
              Clear filters
            </Button>
          }
        />
      );
    }

    return (
      <MarketGrid busy={status === "loading"}>
        {visibleMarkets.map((market) => {
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
    );
  }

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <h1>Live markets</h1>
        {markets && (
          <p className="dashboard__count" aria-live="polite">
            {visibleMarkets.length} {visibleMarkets.length === 1 ? "market" : "markets"}
          </p>
        )}
      </header>
      <DashboardControls
        view={view}
        searchText={searchText}
        blindMode={blindMode}
        onChange={updateView}
        onClear={clearView}
      />
      {renderContent()}
    </section>
  );
}
