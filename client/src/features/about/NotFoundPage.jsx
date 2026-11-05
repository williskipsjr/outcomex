import { Link, useLocation } from "react-router-dom";
import EmptyState from "../../components/EmptyState.jsx";
import "./NotFoundPage.css";

// Shown for any URL that isn't a page. It repeats the address so the visitor
// can spot a typo, and links back to the two main pages.
export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <section className="not-found">
      <h1>Page not found</h1>
      <EmptyState
        title="Nothing lives at this address"
        message={`We couldn't find ${pathname}. It may have moved, or the link has a typo.`}
        action={
          <div className="not-found__links">
            <Link to="/">Live markets</Link>
            <Link to="/practice">Practice</Link>
          </div>
        }
      />
    </section>
  );
}
