import { useEffect, useState } from "react";
import Button from "../../components/Button.jsx";
import Skeleton from "../../components/Skeleton.jsx";
import useRequest from "../../hooks/useRequest.js";
import { chartGeometry, summarizeSeries, toPolyline } from "../../lib/chart.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import { formatDate, formatPercent } from "../../lib/format.js";
import { getSampleHistory } from "./sampleMarketData.js";
import "./PriceChart.css";

const RANGES = [
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "all", label: "All" },
];
const BOX = { width: 600, height: 240, left: 44, right: 8, top: 12, bottom: 28 };
const GRID = [0, 0.25, 0.5, 0.75, 1];

// The crowd's price over time, with your call (dashed amber) and the AI (dotted violet).
// The parent only renders this once the crowd may be shown (blind mode rule).
export default function PriceChart({ marketId, yourCall = null, aiProbability = null }) {
  const [range, setRange] = useState("1w");
  const { status, data, error, run, retry } = useRequest();

  // Each range click starts a new request; useRequest aborts the previous one,
  // so clicking 1D, 1M, All fast always ends on All (latest call wins)
  useEffect(() => {
    run((signal) => getSampleHistory(marketId, range, { signal }));
  }, [marketId, range, run]);

  const points = data?.points ?? [];
  const { y, plotLeft, plotRight } = chartGeometry(BOX);
  const summary = summarizeSeries(points);
  const label = summary
    ? `Crowd probability of YES, ${RANGES.find((r) => r.value === range).label}: ` +
      `started at ${formatPercent(summary.start)}, now ${formatPercent(summary.end)}, ` +
      `lowest ${formatPercent(summary.min)}, highest ${formatPercent(summary.max)}.`
    : "";

  function renderBody() {
    if (!data && (status === "idle" || status === "loading")) return <Skeleton shape="block" />;
    if (status === "error") {
      return (
        <div className="price-chart__message" role="alert">
          <p>{getErrorMessage(error)}</p>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      );
    }
    if (points.length < 2) {
      return <p className="price-chart__message">Not enough price history for this range yet.</p>;
    }

    return (
      <>
        <svg
          className="price-chart__svg"
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          role="img"
          aria-label={label}
          data-busy={status === "loading"}
        >
          {GRID.map((level) => (
            <g key={level}>
              <line className="price-chart__grid" x1={plotLeft} x2={plotRight} y1={y(level)} y2={y(level)} />
              <text className="price-chart__axis" x={plotLeft - 8} y={y(level) + 4} textAnchor="end">
                {Math.round(level * 100)}%
              </text>
            </g>
          ))}
          {aiProbability !== null && (
            <line className="price-chart__ai" x1={plotLeft} x2={plotRight} y1={y(aiProbability)} y2={y(aiProbability)} />
          )}
          {yourCall !== null && (
            <line className="price-chart__you" x1={plotLeft} x2={plotRight} y1={y(yourCall)} y2={y(yourCall)} />
          )}
          <polyline className="price-chart__crowd" points={toPolyline(points, BOX)} />
          <text className="price-chart__axis" x={plotLeft} y={BOX.height - 6}>
            {formatDate(points[0].t)}
          </text>
          <text className="price-chart__axis" x={plotRight} y={BOX.height - 6} textAnchor="end">
            {formatDate(points[points.length - 1].t)}
          </text>
        </svg>
        {/* The same numbers as text, for anyone who can't see the chart */}
        <p className="visually-hidden">{label}</p>
        <ul className="price-chart__legend">
          <li className="price-chart__key price-chart__key--crowd">Crowd</li>
          {yourCall !== null && <li className="price-chart__key price-chart__key--you">Your call</li>}
          {aiProbability !== null && <li className="price-chart__key price-chart__key--ai">AI</li>}
        </ul>
      </>
    );
  }

  return (
    <section className="price-chart" aria-labelledby="price-chart-title">
      <div className="price-chart__head">
        <h2 id="price-chart-title" className="price-chart__title">
          Price history
        </h2>
        <div className="price-chart__ranges" role="group" aria-label="Time range">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              className="price-chart__range"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {renderBody()}
    </section>
  );
}
