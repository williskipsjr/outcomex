import { useEffect, useState } from "react";

// The current time, refreshed every `intervalMs`. Lets text like
// "Updated 30 s ago" stay correct without the user doing anything.
export default function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    // Cleanup: stop the timer when the component goes away or the interval changes
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
