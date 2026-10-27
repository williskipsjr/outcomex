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

const COMPARATORS = {
  ending: (a, b) => time(a.endDate) - time(b.endDate),
  volume: (a, b) => b.volume - a.volume,
  newest: (a, b) => time(b.createdAt) - time(a.createdAt),
  "prob-high": byProbability(-1),
  "prob-low": byProbability(1),
};

export function applyView(markets, view, now = Date.now()) {
  const query = view.q.toLowerCase();
  const compare = COMPARATORS[view.sort] ?? COMPARATORS.ending;

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
