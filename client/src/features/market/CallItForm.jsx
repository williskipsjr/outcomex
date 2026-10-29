import { useId, useRef, useState } from "react";
import Button from "../../components/Button.jsx";
import { parsePercentInput } from "../../lib/callInput.js";
import { MAX_REASON_LENGTH } from "../calls/callsStorage.js";
import "./CallItForm.css";

// The "Call it" form, shared by live and practice markets.
// onCall(probability 0-1, reason) may be sync or async; while it runs the
// form is locked. `busy` lets the parent show a loading state too.
export default function CallItForm({ onCall, busy = false, error = null, submitLabel = "Call it" }) {
  const id = useId();
  // One value behind both controls: the text the user typed (inputs give strings)
  const [text, setText] = useState("50");
  const [touched, setTouched] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState(null);
  // A ref, not state: it must be true immediately, even before React re-renders.
  // This is what really stops a double submit; the disabled button is only UX.
  const submittingRef = useRef(false);

  const parsed = parsePercentInput(text);
  const sliderValue = parsed.percent ?? 50;

  function changeValue(nextText) {
    setText(nextText);
    setTouched(true);
    setFieldError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault(); // a <form> submit: Enter works and the page never reloads
    if (submittingRef.current || busy) return;

    if (parsed.error) {
      setFieldError(parsed.error);
      return;
    }
    if (reason.trim().length > MAX_REASON_LENGTH) {
      setFieldError(`Keep your reason to ${MAX_REASON_LENGTH} characters or fewer.`);
      return;
    }

    submittingRef.current = true;
    try {
      await onCall(parsed.percent / 100, reason.trim());
    } finally {
      // Always released, so a failure never leaves the form stuck
      submittingRef.current = false;
    }
  }

  const errorId = `${id}-error`;
  const shownError = fieldError ?? error;

  return (
    <form className="call-it" onSubmit={handleSubmit} noValidate>
      <h2 className="call-it__title">Make your call</h2>
      <p className="call-it__hint">How likely is YES? Your call is locked once you make it.</p>

      <p className="call-it__value num" aria-hidden="true">
        {parsed.percent ?? "—"}
        <span>%</span>
      </p>

      <label className="call-it__label" htmlFor={`${id}-slider`}>
        Your probability of YES
      </label>
      <input
        id={`${id}-slider`}
        className="call-it__slider"
        type="range"
        min="1"
        max="99"
        step="1"
        value={sliderValue}
        disabled={busy}
        onChange={(event) => changeValue(event.target.value)}
      />

      <div className="call-it__exact">
        <label htmlFor={`${id}-number`}>Exact %</label>
        <input
          id={`${id}-number`}
          className="call-it__number num"
          type="number"
          inputMode="numeric"
          min="1"
          max="99"
          step="1"
          value={text}
          disabled={busy}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={shownError ? errorId : undefined}
          onChange={(event) => changeValue(event.target.value)}
        />
      </div>

      <label className="call-it__label" htmlFor={`${id}-reason`}>
        Why? <span className="call-it__optional">(optional)</span>
      </label>
      <textarea
        id={`${id}-reason`}
        className="call-it__reason"
        rows="2"
        maxLength={MAX_REASON_LENGTH}
        value={reason}
        disabled={busy}
        onChange={(event) => setReason(event.target.value)}
      />
      <p className="call-it__counter num" aria-live="polite">
        {reason.trim().length} / {MAX_REASON_LENGTH}
      </p>

      {shownError && (
        <p id={errorId} className="call-it__error" role="alert">
          {shownError}
        </p>
      )}

      <Button type="submit" loading={busy} disabled={!touched}>
        {submitLabel}
      </Button>
      {!touched && <p className="call-it__nudge">Move the slider or type a number first.</p>}
    </form>
  );
}
