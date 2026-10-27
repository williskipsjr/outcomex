import { useEffect } from "react";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import useSettings from "../settings/useSettings.js";
import { getCardVariant } from "./cardVariant.js";
import MarketCard from "./MarketCard.jsx";
import MarketGrid from "./MarketGrid.jsx";
import { loadSampleMarkets } from "./sampleMarkets.js";
import "./DashboardPage.css";

const SKELETON_COUNT = 8;

export default function DashboardPage() {
  const { status, data: markets, error, run, retry } = useRequest();
  const { blindMode } = useSettings();

  useEffect(() => {
    run((signal) => loadSampleMarkets(signal));
  }, [run]);

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

    return (
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
    );
  }

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <h1>Live markets</h1>
        {markets && (
          <p className="dashboard__count">
            {markets.length} {markets.length === 1 ? "market" : "markets"}
          </p>
        )}
      </header>
      {renderContent()}
    </section>
  );
}
