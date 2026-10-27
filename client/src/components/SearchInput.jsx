import { useId } from "react";
import "./SearchInput.css";

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
