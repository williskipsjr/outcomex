// The one plain sentence under the reveal, comparing you with the crowd.
// Both inputs are probabilities from 0 to 1.
export function describeDifference(you, crowd) {
  if (crowd === null || crowd === undefined) return null;
  const points = Math.round((you - crowd) * 100);

  if (Math.abs(points) < 5) return "You agree with the crowd.";
  const direction = points > 0 ? "more" : "less";
  return `You are ${Math.abs(points)} points ${direction} confident in YES than the crowd.`;
}
