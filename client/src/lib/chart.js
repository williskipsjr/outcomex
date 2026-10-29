// Maths for the market detail price chart. Pure, so it is easy to test.
// Unlike the card sparklines, this chart uses a FIXED 0-100% Y axis, so the
// height of the line always means the same probability.

// box: { width, height, left, right, top, bottom } (padding for axis labels)
export function chartGeometry(box) {
  const plotWidth = box.width - box.left - box.right;
  const plotHeight = box.height - box.top - box.bottom;
  return {
    // probability 0-1 -> y pixel (SVG y grows downwards, so 1 is at the top)
    y: (probability) => box.top + (1 - probability) * plotHeight,
    // index of n points -> x pixel, spread evenly
    x: (index, count) => box.left + (count <= 1 ? 0 : (index / (count - 1)) * plotWidth),
    plotLeft: box.left,
    plotRight: box.width - box.right,
  };
}

export function toPolyline(points, box) {
  const { x, y } = chartGeometry(box);
  return points
    .map((point, index) => `${x(index, points.length).toFixed(1)},${y(point.p).toFixed(1)}`)
    .join(" ");
}

// Start, end, lowest and highest price: the chart's text summary for screen readers
export function summarizeSeries(points) {
  if (points.length === 0) return null;
  const prices = points.map((point) => point.p);
  return {
    start: prices[0],
    end: prices[prices.length - 1],
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}
