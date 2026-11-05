// Turns the loaded markets + the view from the URL into the list the user
// sees. Called during render; the result is never stored in state, so it can
// never disagree with the markets or the URL.
//   status -> category -> search -> sort

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSING_SOON_MS = 7 * DAY_MS;

function matchesStatus(market, status, now) {
  if (status === "all") return true;
  if (market.status !== "open") return false;
  if (status === "closing") {
    const msLeft = new Date(market.endDate).getTime() - now;
    return msLeft > 0 && msLeft <= CLOSING_SOON_MS;
  }
  return true; // "open"
}

const time = (iso) => new Date(iso).getTime();

// Markets without a price go to the end, whichever direction we sort
function byProbability(direction) {
  return (a, b) => {
    if (a.crowdProbability === null) return b.crowdProbability === null ? 0 : 1;
    if (b.crowdProbability === null) return -1;
    return direction * (a.crowdProbability - b.crowdProbability);
  };
}

// Soonest end date first. Markets already past their end date (still open,
// waiting for their result) go after all the upcoming ones, so the top of
// the list is what closes next.
function endingSoonest(now) {
  return (a, b) => {
    const aPast = time(a.endDate) <= now;
    const bPast = time(b.endDate) <= now;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return time(a.endDate) - time(b.endDate);
  };
}

const COMPARATORS = {
  volume: (a, b) => b.volume - a.volume,
  newest: (a, b) => time(b.createdAt) - time(a.createdAt),
  "prob-high": byProbability(-1),
  "prob-low": byProbability(1),
};

export function applyView(markets, view, now = Date.now()) {
  const query = view.q.toLowerCase();
  // "ending" (also the default) depends on today's date, so it is built here
  const compare = COMPARATORS[view.sort] ?? endingSoonest(now);

  return (
    markets
      .filter((market) => matchesStatus(market, view.status, now))
      .filter((market) => view.cat.length === 0 || view.cat.includes(market.category))
      .filter((market) => query === "" || market.question.toLowerCase().includes(query))
      // filter() already returned a new array, so sorting it doesn't touch `markets`.
      // Ties are broken by id, so cards never swap places between renders.
      .sort((a, b) => compare(a, b) || a.id.localeCompare(b.id))
  );
}
