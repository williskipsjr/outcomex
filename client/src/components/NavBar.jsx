import { Link, NavLink } from "react-router-dom";
import "./NavBar.css";

export default function NavBar() {
  return (
    <header className="nav-bar">
      <Link to="/" className="nav-bar__brand">
        OutcomeX
      </Link>
      <nav aria-label="Main">
        <ul className="nav-bar__links">
          <li>
            <NavLink to="/" end className="nav-bar__link">
              Live
            </NavLink>
          </li>
          <li>
            <NavLink to="/practice" className="nav-bar__link">
              Practice
            </NavLink>
          </li>
          <li>
            <NavLink to="/me" className="nav-bar__link">
              My Calls
            </NavLink>
          </li>
          <li>
            <NavLink to="/about" className="nav-bar__link">
              About
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}