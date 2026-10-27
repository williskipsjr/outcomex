import { useState } from "react";
import Badge from "../../components/Badge.jsx";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import ProbabilityBar from "../../components/ProbabilityBar.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import Spinner from "../../components/Spinner.jsx";
import Toggle from "../../components/Toggle.jsx";
import MarketCard from "../dashboard/MarketCard.jsx";
import MarketGrid from "../dashboard/MarketGrid.jsx";
import "./KitPage.css";

const SAMPLE_MARKET = {
  id: "pm-kit-1",
  question: "Will the Fed cut interest rates at the December 2026 meeting?",
  category: "Economy",
  imageUrl: null,
  endDate: "2026-12-16T19:00:00Z",
  crowdProbability: 0.64,
  volume: 1823400,
};

// Development-only page that shows every shared component in one place,
// so the team can see what exists before building something new.
export default function KitPage() {
  const [checked, setChecked] = useState(true);

  return (
    <section className="kit-page">
      <h1>UI kit</h1>

      <h2>Button</h2>
      <div className="kit-page__row">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button loading>Saving</Button>
        <Button disabled>Disabled</Button>
      </div>

      <h2>Badge</h2>
      <div className="kit-page__row">
        <Badge label="Politics" />
        <Badge tone="you" label="Your call" />
        <Badge tone="crowd" label="Crowd" />
        <Badge tone="ai" label="AI" />
        <Badge tone="yes" label="YES" />
        <Badge tone="no" label="NO" />
      </div>

      <h2>ProbabilityBar</h2>
      <div className="kit-page__stack">
        <ProbabilityBar who="you" label="You" value={0.62} />
        <ProbabilityBar who="crowd" label="Crowd" value={0.71} />
        <ProbabilityBar who="ai" label="AI" value={0.55} />
      </div>

      <h2>Toggle and Spinner</h2>
      <div className="kit-page__row">
        <Toggle label="Blind mode" checked={checked} onChange={setChecked} />
        <Spinner />
      </div>

      <h2>Skeleton</h2>
      <div className="kit-page__stack" aria-busy="true">
        <Skeleton />
        <Skeleton shape="card" />
      </div>

      <h2>MarketCard variants</h2>
      <MarketGrid>
        <MarketCard market={SAMPLE_MARKET} variant="blind" />
        <MarketCard market={SAMPLE_MARKET} variant="revealed" />
        <MarketCard market={SAMPLE_MARKET} variant="called" call={{ probability: 0.42 }} />
        <MarketCard
          market={{
            id: "pr-kit-1",
            question: "Will the Fed cut interest rates at the September 2026 meeting?",
            category: "Economy",
            imageUrl: null,
            asOfDate: "2026-09-09T00:00:00Z",
            closedDate: "2026-09-16T18:00:00Z",
          }}
          variant="practice"
        />
      </MarketGrid>

      <h2>ErrorState and EmptyState</h2>
      <div className="kit-page__stack">
        <ErrorState message="Polymarket isn't responding right now." onRetry={() => {}} />
        <EmptyState title="No markets match" message="Try a different search or category." />
      </div>
    </section>
  );
}
