import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_STATE = { status: "idle", data: null, meta: null, error: null };

// One place for the async state machine every data-loading screen needs:
//   idle -> loading -> success | error
//
// Usage:
//   const { status, data, error, run, retry } = useRequest();
//   useEffect(() => {
//     run((signal) => listMarkets({ limit: 100, signal }));
//   }, [run]);
//
// The loader gets an AbortSignal and must resolve to { data, meta }.
export default function useRequest() {
  const [state, setState] = useState(INITIAL_STATE);
  const controllerRef = useRef(null);
  const lastLoaderRef = useRef(null);

  const run = useCallback(async (loader) => {
    // Latest call wins: cancel whatever is still in flight
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastLoaderRef.current = loader;

    // Keep the old data on screen while reloading, so refreshes don't flash
    setState((current) => ({ ...current, status: "loading", error: null }));

    try {
      const result = await loader(controller.signal);
      // A newer call (or unmount) cancelled this one: drop its result
      if (controller.signal.aborted) return;
      setState({ status: "success", data: result.data, meta: result.meta, error: null });
    } catch (error) {
      // Cancelled on purpose: not an error the user should see
      if (controller.signal.aborted || error?.code === "ABORTED") return;
      setState((current) => ({ ...current, status: "error", error }));
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, []);

  // Repeat the last call, e.g. from an ErrorState's "Try again" button
  const retry = useCallback(() => {
    if (lastLoaderRef.current) {
      run(lastLoaderRef.current);
    }
  }, [run]);

  // Leaving the page cancels the request, so no state updates after unmount
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  return { ...state, run, retry };
}
