import { describe, expect, it } from "vitest";
import { formatPercent, formatTimeAgo, formatTimeLeft, formatVolume } from "./format.js";

describe("formatPercent", () => {
  it("turns a decimal into a rounded percentage", () => {
    expect(formatPercent(0.714)).toBe("71%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
  });

  it("shows a dash when there is no value", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });
});

describe("formatVolume", () => {
  it("uses compact dollars", () => {
    expect(formatVolume(1823400)).toBe("$1.8M");
    expect(formatVolume(312050)).toBe("$312.1K");
    expect(formatVolume(0)).toBe("$0");
  });
});

describe("formatTimeLeft", () => {
  const NOW = new Date("2026-10-28T12:00:00Z").getTime();

  it("counts whole days up", () => {
    expect(formatTimeLeft("2026-11-04T12:00:00Z", NOW)).toBe("Closes in 7 days");
    expect(formatTimeLeft("2026-10-30T00:00:00Z", NOW)).toBe("Closes tomorrow");
  });

  it("handles today, the past and bad dates", () => {
    expect(formatTimeLeft("2026-10-28T20:00:00Z", NOW)).toBe("Closes today");
    expect(formatTimeLeft("2026-10-01T00:00:00Z", NOW)).toBe("Closed");
    expect(formatTimeLeft("not a date", NOW)).toBe("No end date");
  });
});

describe("formatTimeAgo", () => {
  const NOW = new Date("2026-10-28T12:00:00Z").getTime();

  it("picks seconds, minutes or hours", () => {
    expect(formatTimeAgo("2026-10-28T11:59:55Z", NOW)).toBe("just now");
    expect(formatTimeAgo("2026-10-28T11:59:30Z", NOW)).toBe("30 s ago");
    expect(formatTimeAgo("2026-10-28T11:45:00Z", NOW)).toBe("15 min ago");
    expect(formatTimeAgo("2026-10-28T09:00:00Z", NOW)).toBe("3 h ago");
  });
});
