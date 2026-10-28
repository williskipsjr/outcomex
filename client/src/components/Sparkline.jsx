import { toSparklinePoints } from "../lib/sparkline.js";
import "./Sparkline.css";

const WIDTH = 100;

// A small price chart. Decoration only: the card always shows the number as
// text too, so the chart is hidden from screen readers.
// who: you | crowd | ai (sets the colour)
export default function Sparkline({ prices, who = "crowd", height = 48 }) {
  const points = toSparklinePoints(prices, WIDTH, height);
  if (points.length === 0) return null;

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  // Same line, closed along the bottom edge, for the soft fill underneath
  const area = `0,${height} ${line} ${WIDTH},${height}`;

  return (
    <svg
      className={`sparkline sparkline--${who}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      aria-hidden="true"
      focusable="false"
    >
      <polygon className="sparkline__area" points={area} />
      {/* non-scaling-stroke keeps the line 2px thick however wide the card is */}
      <polyline className="sparkline__line" points={line} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
