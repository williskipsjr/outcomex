// The dashboard's view (search, categories, status, sort) lives in the URL,
// so a link can be shared. The URL can contain anything, so it is never
// trusted: every value is checked and falls back to a default.

export const CATEGORIES = [
  "Politics",
  "Sports",
  "Crypto",
  "Economy",
  "Tech & Science",
  "World",
  "Culture",
  "Other",
];
export const STATUSES = ["open", "closing", "all"];
export const SORTS = ["ending", "volume", "newest", "prob-high", "prob-low"];
export const DEFAULT_VIEW = { q: "", cat: [], status: "open", sort: "ending" };

const MAX_QUERY_LENGTH = 80;

function parseCategories(raw) {
  const wanted = (raw ?? "").split(",").map((part) => part.trim().toLowerCase());
  // Keep the order of CATEGORIES and drop unknown values and duplicates
  return CATEGORIES.filter((category) => wanted.includes(category.toLowerCase()));
}

// searchParams: a URLSearchParams (what React Router's useSearchParams gives you)
export function parseViewParams(searchParams, { blindMode = false } = {}) {
  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const cat = parseCategories(searchParams.get("cat"));

  const rawStatus = searchParams.get("status");
  const status = STATUSES.includes(rawStatus) ? rawStatus : DEFAULT_VIEW.status;

  const rawSort = searchParams.get("sort");
  let sort = SORTS.includes(rawSort) ? rawSort : DEFAULT_VIEW.sort;
  let sortNote = null;

  // Sorting by probability would leak the crowd's numbers in blind mode
  if (blindMode && sort.startsWith("prob-")) {
    sort = DEFAULT_VIEW.sort;
    sortNote = "Sorting by probability is off while blind mode is on.";
  }

  return { q, cat, status, sort, sortNote };
}

// The reverse: only non-default values go into the URL, so it stays short
export function toSearchParams(view) {
  const params = {};
  if (view.q) params.q = view.q;
  if (view.cat.length > 0) params.cat = view.cat.join(",");
  if (view.status !== DEFAULT_VIEW.status) params.status = view.status;
  if (view.sort !== DEFAULT_VIEW.sort) params.sort = view.sort;
  return params;
}
