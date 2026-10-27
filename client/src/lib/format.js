// Probabilities are stored as decimals (0.71) and shown as percentages ("71%").
export function formatPercent(probability) {
  if (probability === null || probability === undefined) {
    return "—";
  }
  return `${Math.round(probability * 100)}%`;
}
