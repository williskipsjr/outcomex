import Button from "../../components/Button.jsx";
import useCalls from "./useCalls.js";
import "./CallsRepairNotice.css";

// Shown once if saved calls were unreadable and had to be cleaned up (AT-17).
// After this load the store is rewritten with only valid calls, so the
// notice won't come back for the same problem.
export default function CallsRepairNotice() {
  const { repairNotice, dismissRepairNotice } = useCalls();
  if (!repairNotice) return null;

  return (
    <div className="calls-repair-notice" role="status">
      <p>Some saved calls in this browser were damaged and couldn't be read, so they were removed.</p>
      <Button variant="ghost" onClick={dismissRepairNotice}>
        OK
      </Button>
    </div>
  );
}
