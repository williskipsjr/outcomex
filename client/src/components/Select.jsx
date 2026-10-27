import { useId } from "react";
import "./Select.css";

// options: [{ value, label, disabled? }] · onChange receives the new value
export default function Select({ label, value, onChange, options }) {
  const id = useId();

  return (
    <div className="select">
      <label className="select__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="select__field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
