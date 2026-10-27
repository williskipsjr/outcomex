// Probabilities are stored as decimals (0.71) and shown as percentages ("71%").
export function formatPercent(probability) {
  if (probability === null || probability === undefined) {
    return "—";
  }
  return `${Math.round(probability * 100)}%`;
}

const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// "2026-09-30T23:59:00Z" -> "30 Sept 2026". UTC so everyone sees the same date.
export function formatDate(isoTime) {
  return shortDate.format(new Date(isoTime));
}

const compactDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

// 182340.5 -> "$182.3K"
export function formatVolume(volume) {
  return compactDollars.format(volume ?? 0);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// How long until a market closes, in words. `now` is a parameter so the
// function stays pure and easy to check by hand.
export function formatTimeLeft(endDate, now = Date.now()) {
  const msLeft = new Date(endDate).getTime() - now;

  if (Number.isNaN(msLeft)) return "No end date";
  if (msLeft <= 0) return "Closed";
  if (msLeft < DAY_MS) return "Closes today";

  const days = Math.ceil(msLeft / DAY_MS);
  return days === 1 ? "Closes tomorrow" : `Closes in ${days} days`;
}
