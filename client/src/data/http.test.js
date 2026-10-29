import { describe, expect, it, vi } from "vitest";
import { fetchJson } from "./http.js";

const json = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

// A fetch that never answers until its signal aborts, like a hung server
const hangingFetch = (url, { signal }) =>
  new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  });

const failure = async (promise) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
};

describe("fetchJson", () => {
  it("returns the parsed body", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: 1 }));
    await expect(fetchJson("/x", { fetchImpl })).resolves.toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps HTTP statuses to codes and never retries a 4xx", async () => {
    for (const [status, code] of [
      [404, "NOT_FOUND"],
      [422, "NOT_FOUND"],
      [429, "RATE_LIMITED"],
    ]) {
      const fetchImpl = vi.fn(async () => json({}, status));
      const error = await failure(fetchJson("/x", { fetchImpl }));
      expect(error.code).toBe(code);
      expect(error.status).toBe(status);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it("retries a 5xx once and can then succeed", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ ok: 2 }));
    await expect(fetchJson("/x", { fetchImpl })).resolves.toEqual({ ok: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = await failure(fetchJson("/x", { fetchImpl }));
    expect(error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("turns its own timeout into UPSTREAM_TIMEOUT, without retrying", async () => {
    const fetchImpl = vi.fn(hangingFetch);
    const error = await failure(fetchJson("/x", { fetchImpl, timeoutMs: 20 }));
    expect(error.code).toBe("UPSTREAM_TIMEOUT");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("turns the caller's abort into a silent ABORTED", async () => {
    const controller = new AbortController();
    const promise = fetchJson("/x", { fetchImpl: hangingFetch, signal: controller.signal });
    controller.abort();
    expect((await failure(promise)).code).toBe("ABORTED");
    expect((await failure(fetchJson("/x", { fetchImpl: hangingFetch, signal: controller.signal }))).code).toBe("ABORTED");
  });

  it("reports unreadable JSON as INVALID_DATA", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    expect((await failure(fetchJson("/x", { fetchImpl }))).code).toBe("INVALID_DATA");
  });
});
