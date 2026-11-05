import { Link } from "react-router-dom";
import "./Footer.css";

// On every page: where the data comes from, and that OutcomeX is not a betting
// or trading site and gives no financial advice.
export default function Footer() {
  return (
    <footer className="footer">
      <p>
        Market data from{" "}
        <a href="https://polymarket.com" target="_blank" rel="noreferrer">
          Polymarket
        </a>
        . OutcomeX only reads public data: there is no buying, selling or betting here, and nothing
        on this site is financial advice.
      </p>
      <p>
        A Full Stack Development 1 course project, IIIT Dharwad · <Link to="/about">About</Link>
        {" · "}
        <Link to="/welcome">New here? Take the tour</Link>
      </p>
    </footer>
  );
}
