import { isDataError } from "../data/errors.js";

// Every screen turns an error into words through this one function, so the
// app always explains the same problem the same way.
//
// The data layer already writes its messages for people, and they say exactly
// what went wrong ("One of OutcomeX's data files is missing" rather than a
// generic "Polymarket isn't responding"), so those are shown as they are.
// Anything else (a bug in our own code) gets a plain fallback.
export function getErrorMessage(error) {
  if (isDataError(error) && error.message) return error.message;
  return "Something went wrong.";
}
