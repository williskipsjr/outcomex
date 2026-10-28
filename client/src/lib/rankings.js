import { getPriceChange } from "./sparkline.js";

// Pick markets for the home page sections. All pure: they take the loaded
// markets and return a new, shorter array, never changing the input.

const hasPrice = (market) => market.crowdProbability !== null;
const isOpen = (market, now) => market.status === "open" && new Date(market.endDate).getTime() > now;

// The biggest markets by volume, for the featured carousel
export function getFeatured(markets, count = 5) {
  return markets
    .filter(hasPrice)
    .toSorted((a, b) => b.volume - a.volume)
    .slice(0, count);
}

export function getClosingSoon(markets, count = 4, now = Date.now()) {
  return markets
    .filter((market) => isOpen(market, now))
    .toSorted((a, b) => new Date(a.endDate) - new Date(b.endDate))
    .slice(0, count);
}

export function getMostTraded(markets, count = 4) {
  return markets.toSorted((a, b) => b.volume - a.volume).slice(0, count);
}

// Biggest price moves over the sparkline's week, up or down
export function getTopMovers(markets, count = 6) {
  return markets
    .map((market) => ({ market, change: getPriceChange(market.sparkline) }))
    .filter(({ change }) => change !== null && change !== 0)
    .toSorted((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, count);
}
