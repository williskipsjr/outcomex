// Checks what the user typed in the "Call it" form. Inputs always arrive as
// strings, so this converts with Number() and then validates.
// Returns { percent, error }: percent is a whole number 1-99, or null if invalid.
export function parsePercentInput(text) {
  const trimmed = String(text).trim();
  if (trimmed === "") return { percent: null, error: "Enter a number from 1 to 99." };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { percent: null, error: "That isn't a number." };
  if (!Number.isInteger(value)) return { percent: null, error: "Use a whole number, like 62." };
  if (value < 1 || value > 99) return { percent: null, error: "Pick a number from 1 to 99." };

  return { percent: value, error: null };
}
