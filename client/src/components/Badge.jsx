import "./Badge.css";

// tone: neutral | you | crowd | ai | yes | no
export default function Badge({ tone = "neutral", label }) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
