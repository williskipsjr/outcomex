import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { formatDate, formatPercent } from "../../lib/format.js";
import { brierScore, compareForecasts, MIN_CALLS_FOR_SUMMARY } from "../../lib/scoring.js";
import useCalls from "./useCalls.js";
import "./MyCallsPage.css";

const TABS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "practice", label: "Practice" },
];

function SummaryCard({ label, who, result }) {
  return (
    <div className={`my-calls__card my-calls__card--${who}`}>
      <p className="my-calls__card-label">{label}</p>
      <p className="my-calls__card-value num">{result.accuracy ?? "—"}</p>
      <p className="my-calls__card-meta num">
        {result.brier === null ? "No scored calls yet" : `Brier ${result.brier.toFixed(3)} · n = ${result.n}`}
      </p>
    </div>
  );
}

// The browser saves a file from text: make a temporary link to a Blob and click it
function downloadJson(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function MyCallsPage() {
  const { calls, exportCalls, clearCalls } = useCalls();
  const [tab, setTab] = useState("all");

  if (calls.length === 0) {
    return (
      <section className="my-calls">
        <h1>My Calls</h1>
        <EmptyState
          title="No calls yet"
          message="Make a call on a live market, or try Practice mode to get scored straight away."
          action={
            <div className="my-calls__empty-links">
              <Link to="/">Live markets</Link>
              <Link to="/practice">Practice</Link>
            </div>
          }
        />
      </section>
    );
  }

  // Everything below is derived from `calls` on each render: nothing is copied into state
  const comparison = compareForecasts(calls);
  const resolvedCount = calls.filter((call) => call.resolution).length;
  const visibleCalls = calls
    .filter((call) => tab === "all" || call.mode === tab)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));

  function handleClear() {
    const sure = window.confirm(`Delete all ${calls.length} calls from this browser? This can't be undone.`);
    if (sure) clearCalls();
  }

  return (
    <section className="my-calls">
      <div className="my-calls__head">
        <h1>My Calls</h1>
        <div className="my-calls__actions">
          <Button variant="secondary" onClick={() => downloadJson(exportCalls(), "outcomex-calls.json")}>
            Export
          </Button>
          <Button variant="ghost" onClick={handleClear}>
            Clear all
          </Button>
        </div>
      </div>

      <p className="my-calls__counts num">
        {calls.length} {calls.length === 1 ? "call" : "calls"} · {resolvedCount} resolved
      </p>

      {comparison.enoughData ? (
        <div className="my-calls__summary">
          <SummaryCard label="You" who="you" result={comparison.you} />
          <SummaryCard label="Crowd" who="crowd" result={comparison.crowd} />
          <SummaryCard label="AI" who="ai" result={comparison.ai} />
          <p className="my-calls__fair">
            Accuracy is 100 × (1 − Brier); higher is better. You and the crowd are scored on the same{" "}
            {comparison.you.n} resolved calls. The AI only on the {comparison.ai.n} where it had a number
            {comparison.ai.n > 0 && ` (you scored ${comparison.youOnAiCalls.accuracy} on those)`}.
          </p>
        </div>
      ) : (
        <EmptyState
          title="Scores appear after 5 resolved calls"
          message={`You have ${comparison.you.n} of ${MIN_CALLS_FOR_SUMMARY}. Fewer than that says more about luck than skill. Practice markets resolve instantly.`}
          action={<Link to="/practice">Go to Practice</Link>}
        />
      )}

      <div className="my-calls__tabs" role="group" aria-label="Show calls">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="my-calls__tab"
            aria-pressed={tab === option.value}
            onClick={() => setTab(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Wide tables scroll sideways inside this box instead of breaking the page */}
      <div className="my-calls__table-wrap">
        <table className="my-calls__table">
          <caption className="visually-hidden">Your calls, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">You</th>
              <th scope="col">Crowd</th>
              <th scope="col">AI</th>
              <th scope="col">Status</th>
              <th scope="col">Brier</th>
            </tr>
          </thead>
          <tbody>
            {visibleCalls.map((call) => {
              const outcome = call.resolution?.outcome ?? null;
              const href = call.mode === "practice" ? `/practice/${call.marketId}` : `/market/${call.marketId}`;
              return (
                <tr key={call.id}>
                  <td>
                    <Link to={href}>{call.question || call.marketId}</Link>
                    <span className="my-calls__sub">
                      {call.mode === "practice" ? "Practice" : "Live"} · {formatDate(call.createdAt)}
                    </span>
                  </td>
                  <td className="num my-calls__you">{formatPercent(call.probability)}</td>
                  <td className="num">{formatPercent(call.revealed.crowdProbability)}</td>
                  <td className="num">{formatPercent(call.revealed.aiProbability)}</td>
                  <td>
                    {outcome ? (
                      <span className={`my-calls__outcome my-calls__outcome--${outcome.toLowerCase()}`}>
                        Resolved {outcome}
                      </span>
                    ) : (
                      <span className="my-calls__pending">Pending</span>
                    )}
                  </td>
                  <td className="num">{outcome ? brierScore(call.probability, outcome).toFixed(3) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleCalls.length === 0 && <p className="my-calls__none">No {tab} calls yet.</p>}
      </div>
    </section>
  );
}
