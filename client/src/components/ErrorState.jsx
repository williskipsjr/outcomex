import Button from "./Button.jsx";
import "./ErrorState.css";

// Shown in place of a section whose data failed to load. role="alert" makes
// screen readers announce it. When the caller passes onRetry, a "Try again"
// button re-runs the same request.
export default function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <h2 className="error-state__title">{title}</h2>
      {message && <p className="error-state__message">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
