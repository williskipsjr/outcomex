import { useId } from "react";
import "./SearchInput.css";

// A labelled search box. useId gives the label and input a matching id, so
// clicking the label focuses the box and screen readers read the label.
// onChange receives the new text, not the event
export default function SearchInput({ label, value, onChange, placeholder }) {
  const id = useId();

  return (
    <div className="search-input">
      <label className="search-input__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="search-input__field"
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
