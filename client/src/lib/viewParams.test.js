import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, parseViewParams, toSearchParams } from "./viewParams.js";

const parse = (query, options) => parseViewParams(new URLSearchParams(query), options);

describe("parseViewParams", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parse("")).toEqual({ ...DEFAULT_VIEW, sortNote: null });
  });

  it("reads valid values", () => {
    expect(parse("q=fed&cat=Economy&status=closing&sort=volume")).toEqual({
      q: "fed",
      cat: ["Economy"],
      status: "closing",
      sort: "volume",
      sortNote: null,
    });
  });

  it("trims the search and caps it at 80 characters", () => {
    expect(parse("q=%20%20bitcoin%20%20").q).toBe("bitcoin");
    expect(parse(`q=${"a".repeat(200)}`).q).toHaveLength(80);
  });

  it("keeps known categories, ignoring case, junk and duplicates", () => {
    expect(parse("cat=crypto,Nonsense,CRYPTO,tech %26 science").cat).toEqual([
      "Crypto",
      "Tech & Science",
    ]);
  });

  it("falls back to defaults for unknown status and sort", () => {
    const view = parse("status=banana&sort=random");
    expect(view.status).toBe("open");
    expect(view.sort).toBe("ending");
  });

  it("blocks probability sorting in blind mode and explains why", () => {
    const view = parse("sort=prob-high", { blindMode: true });
    expect(view.sort).toBe("ending");
    expect(view.sortNote).toMatch(/blind mode/);
  });

  it("allows probability sorting when blind mode is off", () => {
    expect(parse("sort=prob-low", { blindMode: false }).sort).toBe("prob-low");
  });
});

describe("toSearchParams", () => {
  it("leaves defaults out of the URL", () => {
    expect(toSearchParams(DEFAULT_VIEW)).toEqual({});
  });

  it("writes non-default values", () => {
    expect(
      toSearchParams({ q: "fed", cat: ["Economy", "World"], status: "all", sort: "newest" }),
    ).toEqual({ q: "fed", cat: "Economy,World", status: "all", sort: "newest" });
  });
});
