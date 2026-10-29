import { useContext } from "react";
import { CallsContext } from "./callsContext.js";

export default function useCalls() {
  const calls = useContext(CallsContext);
  if (!calls) {
    throw new Error("useCalls must be used inside <CallsProvider>");
  }
  return calls;
}
