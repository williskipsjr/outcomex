import "./Skeleton.css";

// shape: card | line | block. Hidden from screen readers; the container that
// is loading should set aria-busy instead.
export default function Skeleton({ shape = "line" }) {
  return <div className={`skeleton skeleton--${shape}`} aria-hidden="true" />;
}
