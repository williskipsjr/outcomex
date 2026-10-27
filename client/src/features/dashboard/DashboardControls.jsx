import Button from "../../components/Button.jsx";
import SearchInput from "../../components/SearchInput.jsx";
import Select from "../../components/Select.jsx";
import CategoryChips from "./CategoryChips.jsx";
import "./DashboardControls.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closing", label: "Closing within 7 days" },
  { value: "all", label: "All" },
];

function sortOptions(blindMode) {
  return [
    { value: "ending", label: "Ending soonest" },
    { value: "volume", label: "Most traded" },
    { value: "newest", label: "Newest" },
    // Sorting by the crowd's number would give it away in blind mode
    { value: "prob-high", label: "Most likely YES", disabled: blindMode },
    { value: "prob-low", label: "Least likely YES", disabled: blindMode },
  ];
}

// Controlled by the parent: it owns the view (from the URL) and decides how
// each change is written back. This component only reports what the user did.
export default function DashboardControls({ view, searchText, blindMode, onChange, onClear }) {
  const isFiltered =
    searchText !== "" || view.cat.length > 0 || view.status !== "open" || view.sort !== "ending";

  return (
    <div className="dashboard-controls">
      <div className="dashboard-controls__row">
        <div className="dashboard-controls__search">
          <SearchInput
            label="Search markets"
            placeholder="e.g. bitcoin, election, rates"
            value={searchText}
            onChange={(q) => onChange({ q }, { replace: true })}
          />
        </div>
        <Select
          label="Status"
          value={view.status}
          options={STATUS_OPTIONS}
          onChange={(status) => onChange({ status })}
        />
        <Select
          label="Sort by"
          value={view.sort}
          options={sortOptions(blindMode)}
          onChange={(sort) => onChange({ sort })}
        />
        {isFiltered && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
      <CategoryChips selected={view.cat} onChange={(cat) => onChange({ cat })} />
      {view.sortNote && <p className="dashboard-controls__note">{view.sortNote}</p>}
    </div>
  );
}
