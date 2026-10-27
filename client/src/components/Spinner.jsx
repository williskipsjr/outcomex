import "./Spinner.css";

export default function Spinner({ size = "medium", label = "Loading" }) {
  return <span className={`spinner spinner--${size}`} role="status" aria-label={label} />;
}
