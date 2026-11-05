import { useContext } from "react";
import { CallsContext } from "./callsContext.js";

// How components read and change the saved calls: const { getCall, makeCall } = useCalls().
// The error makes a missing provider obvious instead of failing later on null.
export default function useCalls() {
  const calls = useContext(CallsContext);
  if (!calls) {
    throw new Error("useCalls must be used inside <CallsProvider>");
  }
  return calls;
}
