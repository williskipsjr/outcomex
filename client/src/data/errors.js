// The one error type the data layer ever throws. Every failure, whether it is
// a bad argument, a 404, a timeout or broken JSON, becomes a DataError with a
// code from this list, so the UI only has to know these seven cases.

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_TIMEOUT",
  "INVALID_DATA",
  "ABORTED",
];

export class DataError extends Error {
  // `message` is written for people and may be shown on screen.
  // Technical details go to console.error, never into the message.
  constructor(code, message, { status } = {}) {
    super(message);
    this.name = "DataError";
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

export function isDataError(error) {
  return error instanceof DataError;
}

export function abortedError() {
  return new DataError("ABORTED", "Request cancelled");
}

// Turns an HTTP status into the right code (master plan A.5)
export function errorFromStatus(status, what = "Polymarket") {
  if (status === 404 || status === 422) {
    return new DataError("NOT_FOUND", "We couldn't find that market.", { status });
  }
  if (status === 429) {
    return new DataError("RATE_LIMITED", "Too many requests. Try again in a moment.", { status });
  }
  return new DataError("UPSTREAM_UNAVAILABLE", `${what} isn't responding right now.`, { status });
}
