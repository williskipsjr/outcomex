import { formatPercent } from "../lib/format.js";
import "./ProbabilityBar.css";

// value: 0 to 1 · who: you | crowd | ai
export default function ProbabilityBar({ value, who = "crowd", label }) {
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <div className={`probability-bar probability-bar--${who}`}>
      <div className="probability-bar__header">
        <span>{label}</span>
        <span className="probability-bar__value num">{formatPercent(value)}</span>
      </div>
      {/* The text above carries the value, so the bar itself is decoration */}
      <div className="probability-bar__track" aria-hidden="true">
        <div className="probability-bar__fill" style={{ transform: `scaleX(${clamped})` }} />
      </div>
    </div>
  );
}
