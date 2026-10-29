import { abortedError } from "./errors.js";

// The data layer's cache. It does three jobs a backend would normally do:
//
//   1. TTL cache: a fresh copy in memory is returned without any request.
//      That keeps us well inside Polymarket's rate limits.
//   2. In-flight de-duplication: two components asking for the same thing at
//      the same moment share one request.
//   3. Stale-if-error: the last good copy of every request is also kept in
//      sessionStorage. If the source fails and that copy is under 24 h old,
//      it is returned with meta.stale = true and the UI shows a banner.

const STORAGE_KEY = "outcomex.v1.cache";
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_MEMORY_ENTRIES = 200;
const MAX_STORED_ENTRIES = 40;

// Failures where an old copy would be the wrong answer, not a fallback
const NEVER_STALE = ["ABORTED", "VALIDATION_ERROR", "NOT_FOUND"];

function toIso(time) {
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// sessionStorage doesn't exist in Node (tests, the snapshot script) and can
// throw in private windows or when full, so every access is guarded
function browserStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function createCache({ storage = browserStorage(), now = () => Date.now() } = {}) {
  const memory = new Map(); // key -> { value, storedAt, ttlMs }
  const inFlight = new Map(); // key -> { promise, controller, waiting }

  function readStored() {
    if (!storage) return {};
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeStored(key, value, storedAt) {
    if (!storage) return;
    try {
      const stored = readStored();
      stored[key] = { value, storedAt };
      // Keep only the newest entries, so the copy never outgrows the quota
      const newest = Object.entries(stored)
        .sort((a, b) => b[1].storedAt - a[1].storedAt)
        .slice(0, MAX_STORED_ENTRIES);
      storage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(newest)));
    } catch {
      // Full or blocked storage only costs us the stale fallback
    }
  }

  function remember(key, value, ttlMs) {
    const storedAt = now();
    memory.delete(key); // re-insert so Map order stays oldest-first
    memory.set(key, { value, storedAt, ttlMs });
    if (memory.size > MAX_MEMORY_ENTRIES) {
      memory.delete(memory.keys().next().value);
    }
    writeStored(key, value, storedAt);
    return storedAt;
  }

  function findStaleCopy(key) {
    const inMemory = memory.get(key);
    const copy = inMemory ?? readStored()[key];
    if (!copy || now() - copy.storedAt > STALE_MAX_AGE_MS) return null;
    return copy;
  }

  // Starts the shared request, or joins the one already running. The request
  // gets its own AbortController: it is cancelled only when every caller
  // waiting for it has cancelled, so one component leaving a page never
  // breaks another component's load.
  function join(key, load) {
    let entry = inFlight.get(key);
    if (!entry) {
      const controller = new AbortController();
      entry = { controller, waiting: 0, promise: null };
      entry.promise = load(controller.signal);
      const settled = () => {
        if (inFlight.get(key) === entry) inFlight.delete(key);
      };
      entry.promise.then(settled, settled);
      inFlight.set(key, entry);
    }
    return entry;
  }

  function waitFor(key, entry, signal) {
    entry.waiting += 1;
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        entry.waiting -= 1;
        if (entry.waiting === 0) {
          entry.controller.abort();
          if (inFlight.get(key) === entry) inFlight.delete(key);
        }
        reject(abortedError());
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      entry.promise.then(
        (value) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error) => {
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  }

  // key: a string that identifies the request (function + arguments)
  // load(signal): does the real work and resolves to the normalised value
  // Resolves to { data, meta } or rejects with a DataError.
  async function get(key, ttlMs, load, { signal, source }) {
    if (signal?.aborted) throw abortedError();

    const cached = memory.get(key);
    if (cached && now() - cached.storedAt < ttlMs) {
      return { data: cached.value, meta: { fetchedAt: toIso(cached.storedAt), stale: false, cache: "hit", source } };
    }

    try {
      const entry = join(key, async (sharedSignal) => {
        const value = await load(sharedSignal);
        return { value, storedAt: remember(key, value, ttlMs) };
      });
      const { value, storedAt } = await waitFor(key, entry, signal);
      return { data: value, meta: { fetchedAt: toIso(storedAt), stale: false, cache: "miss", source } };
    } catch (error) {
      if (NEVER_STALE.includes(error?.code)) throw error;
      const copy = findStaleCopy(key);
      if (!copy) throw error;
      console.error("[data] serving a stale copy of", key, "because:", error?.message);
      return { data: copy.value, meta: { fetchedAt: toIso(copy.storedAt), stale: true, cache: "stale", source } };
    }
  }

  function clear() {
    memory.clear();
    inFlight.clear();
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      // nothing to clean up
    }
  }

  return { get, clear };
}

// One readable key per request, e.g. "getHistory:pm-665374:1w"
export function cacheKey(name, ...args) {
  return [name, ...args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))].join(":");
}
