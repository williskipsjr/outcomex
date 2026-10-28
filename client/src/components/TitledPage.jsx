import useDocumentTitle from "../hooks/useDocumentTitle.js";

// Wraps a route's page to give it a fixed tab title, so the title for every
// static page is set in one place (App.jsx). Pages whose title depends on
// their data (a market's question) call useDocumentTitle themselves instead:
// React runs a parent's effect after its children's, so a wrapper here would
// overwrite their title.
export default function TitledPage({ title, children }) {
  useDocumentTitle(title);
  return children;
}
