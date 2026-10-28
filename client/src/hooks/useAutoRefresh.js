import { useEffect, useRef } from "react";

// Calls `refresh` every `intervalMs` while the tab is visible.
//   - Tab hidden (another tab, minimised): the timer stops, so we don't
//     hit Polymarket for a page nobody is looking at.
//   - Tab visible again: refresh straight away if the data is older than
//     one interval, then restart the timer.
export default function useAutoRefresh(refresh, intervalMs = 60000) {
  // Always call the newest `refresh` without restarting the timer when it changes
  const refreshRef = useRef(refresh);
  // Set in the effect below: render must stay pure, and Date.now() is not
  const lastRunRef = useRef(0);

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    let timerId = null;
    // The page loads its data when it mounts, so count that as the first run
    lastRunRef.current = Date.now();

    function runRefresh() {
      lastRunRef.current = Date.now();
      refreshRef.current();
    }

    function start() {
      if (timerId === null) {
        timerId = setInterval(runRefresh, intervalMs);
      }
    }

    function stop() {
      clearInterval(timerId);
      timerId = null;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
        return;
      }
      if (Date.now() - lastRunRef.current >= intervalMs) {
        runRefresh();
      }
      start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: no timer or listener survives the page
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);
}
