import { useEffect, useState } from "react";
import { CallsContext } from "./callsContext.js";
import { CALLS_STORAGE_KEY, createCall, parseStoredCalls, validateNewCall } from "./callsStorage.js";

// localStorage can throw (e.g. blocked in some private windows), so reading it
// is wrapped: no storage simply means no saved calls.
function readStorage() {
  try {
    return localStorage.getItem(CALLS_STORAGE_KEY);
  } catch {
    return null;
  }
}

// The one source of truth for the user's calls. Loaded once, saved on every change.
export default function CallsProvider({ children }) {
  // Lazy initial state: read and repair storage once, on the first render only
  const [initial] = useState(() => parseStoredCalls(readStorage()));
  const [calls, setCalls] = useState(initial.calls);
  const [repairNotice, setRepairNotice] = useState(initial.repaired);

  // Course persistence pattern: write back in an effect whenever calls change.
  // If storage was broken, this also replaces it with the repaired list.
  useEffect(() => {
    try {
      localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calls));
    } catch {
      // Storage blocked or full: calls still work until the tab closes
    }
  }, [calls]);

  // Your call on one market, or null. Live and practice calls are kept apart,
  // so the same question can be called once in each mode.
  function getCall(marketId, mode = "live") {
    return calls.find((call) => call.marketId === marketId && call.mode === mode) ?? null;
  }

  // Returns { ok: true, call } or { ok: false, error }. Calls are locked once made.
  function makeCall(input) {
    const error = validateNewCall(input, calls);
    if (error) return { ok: false, error };

    const call = createCall(input);
    // Immutable update: a new array with the new call at the front
    setCalls((current) => [call, ...current]);
    return { ok: true, call };
  }

  // Called by useResolutionCheck when Polymarket says markets have ended.
  // updates: [{ marketId, outcome, resolvedAt }]. Only live calls that are still open change.
  function resolveCalls(updates) {
    const byMarket = new Map(updates.map((update) => [update.marketId, update]));
    setCalls((current) =>
      current.map((call) => {
        const update = byMarket.get(call.marketId);
        if (call.mode !== "live" || call.resolution || !update) return call;
        return { ...call, resolution: { outcome: update.outcome, resolvedAt: update.resolvedAt } };
      }),
    );
  }

  // My Calls' Export button: the calls as readable JSON for the user to keep
  function exportCalls() {
    return JSON.stringify(calls, null, 2);
  }

  function clearCalls() {
    setCalls([]);
  }

  const value = {
    calls,
    getCall,
    makeCall,
    resolveCalls,
    exportCalls,
    clearCalls,
    repairNotice,
    dismissRepairNotice: () => setRepairNotice(false),
  };

  return <CallsContext.Provider value={value}>{children}</CallsContext.Provider>;
}
