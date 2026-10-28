import { useEffect, useState } from "react";

// Returns `value`, but only after it has stopped changing for `delayMs`.
// Typing "bitcoin" fast gives one update at the end instead of seven, so we
// send one search request instead of seven.
export default function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    // A new keystroke before the delay is up cancels the pending update
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
