import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { DEFAULT_VIEW, parseViewParams, toSearchParams } from "../../lib/viewParams.js";
import CategoryChips from "../dashboard/CategoryChips.jsx";
import MarketCard from "../dashboard/MarketCard.jsx";
import MarketGrid from "../dashboard/MarketGrid.jsx";
import { loadSamplePractice } from "./samplePractice.js";
import "./PracticeListPage.css";

const SKELETON_COUNT = 6;

export default function PracticeListPage() {
  const { status, data: practiceMarkets, error, run, retry } = useRequest();
  const [searchParams, setSearchParams] = useSearchParams();

  // Same URL rules as the dashboard (?cat=Crypto,World), so links can be shared
  // and junk values are ignored. Only the category part applies here.
  const { cat } = parseViewParams(searchParams);
  const visibleMarkets = (practiceMarkets ?? []).filter(
    (market) => cat.length === 0 || cat.includes(market.category),
  );

  function setCategories(nextCat) {
    setSearchParams(toSearchParams({ ...DEFAULT_VIEW, cat: nextCat }));
  }

  useEffect(() => {
    run((signal) => loadSamplePractice(signal));
  }, [run]);

  function renderContent() {
    if (!practiceMarkets && (status === "idle" || status === "loading")) {
      return (
        <MarketGrid busy>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <Skeleton key={index} shape="card" />
          ))}
        </MarketGrid>
      );
    }

    if (!practiceMarkets && status === "error") {
      return (
        <ErrorState
          title="Couldn't load practice markets"
          message={getErrorMessage(error)}
          onRetry={retry}
        />
      );
    }

    if (practiceMarkets.length === 0) {
      return (
        <EmptyState
          title="No practice markets yet"
          message="New ones are added as live markets resolve. Try the live markets meanwhile."
        />
      );
    }

    if (visibleMarkets.length === 0) {
      return (
        <EmptyState
          title="No practice markets in these categories"
          message="Pick another category, or show them all."
          action={
            <Button variant="secondary" onClick={() => setCategories([])}>
              Show all categories
            </Button>
          }
        />
      );
    }

    return (
      <MarketGrid busy={status === "loading"}>
        {visibleMarkets.map((market) => (
          <MarketCard key={market.id} market={market} variant="practice" />
        ))}
      </MarketGrid>
    );
  }

  return (
    <section className="practice-list">
      <h1>Practice</h1>
      <div className="practice-list__intro">
        <h2 className="practice-list__intro-title">A time machine for forecasts</h2>
        <p>
          These questions have already been answered. Each one takes you back to a week before it
          closed: make your call without knowing what happened, then see the outcome, what the
          crowd thought on that day, and your score straight away.
        </p>
      </div>
      <div className="practice-list__filters">
        <CategoryChips selected={cat} onChange={setCategories} />
        {practiceMarkets && (
          <p className="practice-list__count" aria-live="polite">
            {visibleMarkets.length} {visibleMarkets.length === 1 ? "market" : "markets"}
          </p>
        )}
      </div>
      {renderContent()}
    </section>
  );
}
