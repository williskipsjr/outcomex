import "./Spinner.css";

// A spinning circle drawn in CSS. role="status" with a label tells screen
// readers something is loading.
export default function Spinner({ size = "medium", label = "Loading" }) {
  return <span className={`spinner spinner--${size}`} role="status" aria-label={label} />;
}
