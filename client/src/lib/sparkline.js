// Turns a list of prices (0 to 1, oldest first) into SVG coordinates for a
// small chart. Pure maths, no React, so it is easy to test.
//
// The chart is zoomed to the prices' own range (like Kalshi and Polymarket),
// but never to less than MIN_RANGE, so a market that barely moved still looks
// flat instead of turning tiny wiggles into mountains.
const MIN_RANGE = 0.1;
const PADDING = 2;

export function toSparklinePoints(prices, width, height) {
  if (!prices || prices.length < 2) return [];

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, MIN_RANGE);
  const bottom = (min + max) / 2 - range / 2;
  const usableHeight = height - PADDING * 2;

  return prices.map((price, index) => {
    const x = (index / (prices.length - 1)) * width;
    // SVG y grows downwards, so higher prices get a smaller y
    const y = PADDING + usableHeight - ((price - bottom) / range) * usableHeight;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  });
}

// Change from the first to the last price, in percentage points (0.42 -> 0.47 is +5)
export function getPriceChange(prices) {
  if (!prices || prices.length < 2) return null;
  const change = (prices[prices.length - 1] - prices[0]) * 100;
  return Math.round(change * 10) / 10;
}

// The week's change for a market, in points. Prefers Gamma's weekChange
// (free with the market list); falls back to the sparkline when it's missing.
export function getMarketChange(market) {
  if (typeof market.weekChange === "number") {
    return Math.round(market.weekChange * 1000) / 10;
  }
  return getPriceChange(market.sparkline);
}
