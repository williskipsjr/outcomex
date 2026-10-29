import { describe, expect, it, vi } from "vitest";
import { createCache } from "./cache.js";
import { DataError } from "./errors.js";

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

function setup() {
  let time = Date.parse("2026-10-30T10:00:00Z");
  const clock = { now: () => time, advance: (ms) => (time += ms) };
  const storage = memoryStorage();
  const cache = createCache({ storage, now: clock.now });
  return { cache, clock, storage };
}

const source = "test";
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createCache", () => {
  it("serves a fresh copy from memory until the TTL runs out", async () => {
    const { cache, clock } = setup();
    const load = vi.fn(async () => ["a"]);

    const first = await cache.get("k", 60_000, load, { source });
    expect(first.meta).toMatchObject({ cache: "miss", stale: false, source });

    clock.advance(30_000);
    const second = await cache.get("k", 60_000, load, { source });
    expect(second).toMatchObject({ data: ["a"], meta: { cache: "hit", fetchedAt: first.meta.fetchedAt } });
    expect(load).toHaveBeenCalledTimes(1);

    clock.advance(31_000);
    await cache.get("k", 60_000, load, { source });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight request between callers", async () => {
    const { cache } = setup();
    const pending = deferred();
    const load = vi.fn(() => pending.promise);

    const a = cache.get("k", 1000, load, { source });
    const b = cache.get("k", 1000, load, { source });
    pending.resolve("value");

    expect((await a).data).toBe("value");
    expect((await b).data).toBe("value");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps a shared request going while anyone still waits for it", async () => {
    const { cache } = setup();
    const pending = deferred();
    let sharedSignal;
    const load = (signal) => {
      sharedSignal = signal;
      return pending.promise;
    };

    const leaving = new AbortController();
    const a = cache.get("k", 1000, load, { source, signal: leaving.signal });
    const b = cache.get("k", 1000, load, { source });
    leaving.abort();

    await expect(a).rejects.toMatchObject({ code: "ABORTED" });
    expect(sharedSignal.aborted).toBe(false);
    pending.resolve("still here");
    expect((await b).data).toBe("still here");
  });

  it("cancels the shared request when every caller has left", async () => {
    const { cache } = setup();
    let sharedSignal;
    const load = (signal) => {
      sharedSignal = signal;
      return new Promise(() => {});
    };
    const controller = new AbortController();
    const a = cache.get("k", 1000, load, { source, signal: controller.signal });
    controller.abort();
    await expect(a).rejects.toMatchObject({ code: "ABORTED" });
    expect(sharedSignal.aborted).toBe(true);
  });

  it("falls back to a stale copy from sessionStorage when the source fails (AT-20)", async () => {
    const { storage, clock } = setup();
    const first = createCache({ storage, now: clock.now });
    await first.get("markets", 60_000, async () => ["saved"], { source });

    // A new page load: empty memory, same tab storage, source is down
    clock.advance(2 * 60 * 60 * 1000);
    const afterReload = createCache({ storage, now: clock.now });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = async () => {
      throw new DataError("UPSTREAM_UNAVAILABLE", "down");
    };
    const result = await afterReload.get("markets", 60_000, down, { source });
    expect(result).toMatchObject({ data: ["saved"], meta: { stale: true, cache: "stale" } });
  });

  it("doesn't serve copies older than 24 hours, or for NOT_FOUND", async () => {
    const { cache, clock } = setup();
    await cache.get("k", 1000, async () => "old", { source });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const notFound = async () => {
      throw new DataError("NOT_FOUND", "gone");
    };
    clock.advance(5000);
    await expect(cache.get("k", 1000, notFound, { source })).rejects.toMatchObject({ code: "NOT_FOUND" });

    clock.advance(25 * 60 * 60 * 1000);
    const down = async () => {
      throw new DataError("UPSTREAM_TIMEOUT", "slow");
    };
    await expect(cache.get("k", 1000, down, { source })).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT" });
  });

  it("survives broken or missing storage", async () => {
    const broken = {
      getItem: () => "{not json",
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const cache = createCache({ storage: broken });
    await expect(cache.get("k", 1000, async () => 1, { source })).resolves.toMatchObject({ data: 1 });
    const noStorage = createCache({ storage: null });
    await expect(noStorage.get("k", 1000, async () => 2, { source })).resolves.toMatchObject({ data: 2 });
  });
});
