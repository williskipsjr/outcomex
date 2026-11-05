import { describe, expect, it } from "vitest";
import { DataError } from "../data/errors.js";
import { getErrorMessage } from "./errorMessages.js";

describe("getErrorMessage", () => {
  it("shows the data layer's own message, so a missing file isn't blamed on Polymarket", () => {
    const error = new DataError("UPSTREAM_UNAVAILABLE", "One of OutcomeX's data files is missing.", { status: 404 });
    expect(getErrorMessage(error)).toBe("One of OutcomeX's data files is missing.");
  });

  it("falls back to a plain message for anything that isn't a DataError", () => {
    expect(getErrorMessage(new TypeError("x is undefined"))).toBe("Something went wrong.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong.");
  });
});
