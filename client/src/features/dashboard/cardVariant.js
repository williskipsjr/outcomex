// Which version of a market card to show. Derived from the inputs every
// render, never stored, so it can't go out of sync with the settings or calls.
//   called   - you have made a call on this market (blind mode doesn't matter)
//   blind    - blind mode is on and you haven't called it: no numbers at all
//   revealed - blind mode is off: show the crowd's probability
export function getCardVariant({ blindMode, call }) {
  if (call) return "called";
  return blindMode ? "blind" : "revealed";
}
