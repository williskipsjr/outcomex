import Spinner from "./Spinner.jsx";
import "./Button.css";

export default function Button({
  variant = "primary",
  type = "button",
  loading = false,
  disabled = false,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`button button--${variant}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {/* The label stays in place (just hidden) so the button keeps its width */}
      <span className={loading ? "button__label button__label--hidden" : "button__label"}>
        {children}
      </span>
      {loading && (
        <span className="button__spinner">
          <Spinner size="small" />
        </span>
      )}
    </button>
  );
}
