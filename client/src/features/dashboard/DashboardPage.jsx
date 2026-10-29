import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import useAutoRefresh from "../../hooks/useAutoRefresh.js";
import useDebouncedValue from "../../hooks/useDebouncedValue.js";
import useNow from "../../hooks/useNow.js";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { formatTimeAgo } from "../../lib/format.js";
import { applyView } from "../../lib/filters.js";
import { getClosingSoon, getFeatured, getMostTraded, getTopMovers } from "../../lib/rankings.js";
import { parseViewParams, toSearchParams } from "../../lib/viewParams.js";
import useCalls from "../calls/useCalls.js";
import useSettings from "../settings/useSettings.js";
import DashboardControls from "./DashboardControls.jsx";
import FeaturedCarousel from "./FeaturedCarousel.jsx";
import MarketCards from "./MarketCards.jsx";
import MarketGrid from "./MarketGrid.jsx";
import MarketRow from "./MarketRow.jsx";
import RemoteResults from "./RemoteResults.jsx";
import { loadSampleMarkets } from "./sampleMarkets.js";
import { searchSampleMarkets } from "./sampleSearch.js";
import TopMovers from "./TopMovers.jsx";
import "./DashboardPage.css";

const SKELETON_COUNT = 8;
const AUTO_REFRESH_MS = 60 * 1000;
// Search Polymarket too once the query is long enough and few loaded markets match
const REMOTE_MIN_QUERY = 3;
const REMOTE_MAX_LOCAL_MATCHES = 5;

export default function DashboardPage() {
  const { status, data: markets, meta, error, run, retry } = useRequest();
  const { blindMode } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow();

  function loadMarkets() {
    run((signal) => loadSampleMarkets(signal));
  }

  useEffect(() => {
    run((signal) => loadSampleMarkets(signal));
  }, [run]);

  // Prices move: reload every minute while the tab is open (old cards stay visible)
  useAutoRefresh(loadMarkets, AUTO_REFRESH_MS);

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

  // Your saved calls decide which cards show the "called" variant
  const { getCall } = useCalls();

  // Remote search: a second, separate request with its own state machine.
  // The debounce means one request when typing stops, not one per key, and
  // useRequest aborts the previous search, so a slow old answer can't
  // replace a newer one (latest call wins).
  const remote = useRequest();
  const { run: runRemote, reset: resetRemote } = remote;
  const debouncedQuery = useDebouncedValue(view.q, 300);
  const shouldSearchRemote =
    Boolean(markets) &&
    debouncedQuery.length >= REMOTE_MIN_QUERY &&
    visibleMarkets.length < REMOTE_MAX_LOCAL_MATCHES;

  useEffect(() => {
    if (!shouldSearchRemote) {
      resetRemote();
      return;
    }
    runRemote((signal) => searchSampleMarkets({ q: debouncedQuery, signal }));
  }, [shouldSearchRemote, debouncedQuery, runRemote, resetRemote]);

  // Don't show a market twice if it is already in the loaded list
  const loadedIds = new Set((markets ?? []).map((market) => market.id));
  const remoteMarkets = remote.data?.filter((market) => !loadedIds.has(market.id)) ?? null;

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
        <MarketCards markets={visibleMarkets} blindMode={blindMode} getCall={getCall} />
      </MarketGrid>
    );
  }

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <h1>Live markets</h1>
        {markets && (
          <div className="dashboard__status">
            <p className="dashboard__count" aria-live="polite">
              {visibleMarkets.length} {visibleMarkets.length === 1 ? "market" : "markets"}
            </p>
            {meta && <p className="dashboard__updated">Updated {formatTimeAgo(meta.fetchedAt, now)}</p>}
            {/* Old cards stay on screen while this reloads (useRequest keeps data) */}
            <Button variant="secondary" loading={status === "loading"} onClick={loadMarkets}>
              Refresh
            </Button>
          </div>
        )}
      </header>

      {/* Home page sections, all derived from the same loaded list */}
      {markets && (
        <>
          {/* Every item here is a crowd number, so it stays hidden in blind mode */}
          {!blindMode && <TopMovers movers={getTopMovers(markets)} />}
          <FeaturedCarousel markets={getFeatured(markets)} blindMode={blindMode} getCall={getCall} />
          <MarketRow
            title="Closing soon"
            markets={getClosingSoon(markets, 4, now)}
            blindMode={blindMode}
            getCall={getCall}
          />
          <MarketRow
            title="Most traded"
            markets={getMostTraded(markets)}
            blindMode={blindMode}
            getCall={getCall}
          />
          <h2 className="dashboard__browse-title">Browse markets</h2>
        </>
      )}

      <DashboardControls
        view={view}
        searchText={searchText}
        blindMode={blindMode}
        onChange={updateView}
        onClear={clearView}
      />
      {renderContent()}
      {shouldSearchRemote && (
        <RemoteResults
          status={remote.status}
          markets={remoteMarkets}
          error={remote.error}
          onRetry={remote.retry}
          blindMode={blindMode}
          getCall={getCall}
        />
      )}
    </section>
  );
}
