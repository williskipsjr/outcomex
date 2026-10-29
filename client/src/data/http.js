import { DataError, abortedError, errorFromStatus } from "./errors.js";

export const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 300;

// Waits, but stops early (with ABORTED) if the caller cancels
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortedError());
      },
      { once: true },
    );
  });
}

// One attempt: fetch with our own 8 s timeout, turn every failure into a
// DataError. Two different things can cancel the request, and the user must
// see them differently:
//   - the caller's signal (a newer request replaced this one): ABORTED, silent
//   - our timeout: UPSTREAM_TIMEOUT, shown with Retry
async function attempt(url, { signal, timeoutMs, fetchImpl, what }) {
  if (signal?.aborted) throw abortedError();

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener("abort", onCallerAbort, { once: true });

  try {
    let response;
    try {
      response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    } catch (error) {
      if (timedOut) throw new DataError("UPSTREAM_TIMEOUT", `${what} is taking too long to answer.`);
      if (signal?.aborted) throw abortedError();
      console.error("[data] network error", url, error);
      throw new DataError("UPSTREAM_UNAVAILABLE", `${what} isn't responding right now.`);
    }

    if (!response.ok) throw errorFromStatus(response.status, what);

    try {
      return await response.json();
    } catch (error) {
      if (timedOut) throw new DataError("UPSTREAM_TIMEOUT", `${what} is taking too long to answer.`);
      if (signal?.aborted) throw abortedError();
      console.error("[data] bad JSON", url, error);
      throw new DataError("INVALID_DATA", "We got data we couldn't read.");
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}

// Retry once, and only for failures that might fix themselves: a network
// error or a 5xx. Never a 4xx (asking again won't help), never a timeout
// (the user already waited 8 s), never an abort.
function isRetryable(error) {
  return error.code === "UPSTREAM_UNAVAILABLE";
}

// The only function in the app that calls fetch. Resolves to parsed JSON or
// rejects with a DataError.
export async function fetchJson(
  url,
  { signal, timeoutMs = TIMEOUT_MS, retries = 1, fetchImpl = globalThis.fetch, what = "Polymarket" } = {},
) {
  for (let tryNumber = 0; ; tryNumber += 1) {
    try {
      return await attempt(url, { signal, timeoutMs, fetchImpl, what });
    } catch (error) {
      if (tryNumber >= retries || !isRetryable(error)) throw error;
      await wait(RETRY_DELAY_MS, signal);
    }
  }
}
