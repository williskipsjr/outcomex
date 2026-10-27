import { CATEGORIES } from "../../lib/viewParams.js";
import "./CategoryChips.css";

// selected: array of category names (empty = all) · onChange receives the new array
export default function CategoryChips({ selected, onChange }) {
  function toggle(category) {
    // New array every time: add the category if missing, remove it if present
    const next = selected.includes(category)
      ? selected.filter((item) => item !== category)
      : [...selected, category];
    onChange(next);
  }

  return (
    <div className="category-chips" role="group" aria-label="Categories">
      <button
        type="button"
        className="category-chips__chip"
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
      >
        All
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          className="category-chips__chip"
          aria-pressed={selected.includes(category)}
          onClick={() => toggle(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
