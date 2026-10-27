// Pretends to be a data-layer call while the real one doesn't exist yet.
// Same contract as the data layer: takes an AbortSignal, resolves to
// { data, meta } after a short delay, rejects with code ABORTED when cancelled.
//
// Debug failure switch from the plan: in DevTools run
//   localStorage.setItem("outcomex.debug.fail", "UPSTREAM_UNAVAILABLE")
// and reload to see error states. Remove the key to go back to normal.

function readDebugFailure() {
  try {
    return localStorage.getItem("outcomex.debug.fail");
  } catch {
    return null;
  }
}

export function simulateRequest(data, signal, { delayMs = 600 } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const failCode = readDebugFailure();
      if (failCode) {
        reject({ code: failCode, message: "Simulated failure (outcomex.debug.fail)" });
        return;
      }
      resolve({
        data,
        meta: { fetchedAt: new Date().toISOString(), stale: false, cache: "miss", source: "sample" },
      });
    }, delayMs);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject({ code: "ABORTED", message: "Request cancelled" });
    });
  });
}
