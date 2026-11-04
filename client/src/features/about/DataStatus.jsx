import { useEffect } from "react";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import { checkSources } from "../../data/index.js";
import useRequest from "../../hooks/useRequest.js";
import { getErrorMessage } from "../../lib/errorMessages.js";
import "./DataStatus.css";

// "Data status" (D10, P1): one quick request per source, run when the page
// opens and again on "Check again". checkSources never rejects: a source that
// fails is a line that says so. The error branch is only a safety net.
export default function DataStatus() {
  const { status, data: checks, error, run, retry } = useRequest();

  useEffect(() => {
    run(() => checkSources());
  }, [run]);

  function renderChecks() {
    if (!checks && (status === "idle" || status === "loading")) {
      return (
        <p className="data-status__note">
          <Spinner size="small" label="Checking the data sources" /> Checking the data sources…
        </p>
      );
    }
    if (!checks && status === "error") {
      return <p className="data-status__note">Couldn't run the check: {getErrorMessage(error)}</p>;
    }
    return (
      <ul className="data-status__list">
        {checks.map((check) => (
          <li key={check.name}>
            {/* The word carries the meaning; the dot is only decoration */}
            <span className={`data-status__dot data-status__dot--${check.ok ? "ok" : "down"}`} aria-hidden="true" />
            <span className="data-status__name">{check.name}</span>
            <span className="data-status__result">
              {check.ok ? "OK" : "Problem"} · {check.detail}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="data-status">
      <div className="data-status__header">
        <h3>Data status</h3>
        <Button variant="secondary" loading={status === "loading"} onClick={retry}>
          Check again
        </Button>
      </div>
      {renderChecks()}
    </div>
  );
}
