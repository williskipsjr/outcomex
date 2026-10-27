// Every screen turns a DataError into words through this one function, so the
// app always explains the same problem the same way. The PM owns the final
// wording (copy deck); these are the working versions.
const MESSAGES = {
  VALIDATION_ERROR: "That doesn't look right. Check it and try again.",
  NOT_FOUND: "We couldn't find that market.",
  RATE_LIMITED: "Too many requests. Try again in a moment.",
  UPSTREAM_UNAVAILABLE: "Polymarket isn't responding right now.",
  UPSTREAM_TIMEOUT: "Polymarket is taking too long to answer.",
  INVALID_DATA: "We got data we couldn't read.",
};

export function getErrorMessage(error) {
  return MESSAGES[error?.code] ?? "Something went wrong.";
}
