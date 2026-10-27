import "./MarketGrid.css";

// Just the layout. Callers decide what goes in each cell, so the same grid
// serves the dashboard, the loading skeletons and later the practice list.
export default function MarketGrid({ children, busy = false }) {
  return (
    <div className="market-grid" aria-busy={busy}>
      {children}
    </div>
  );
}
