import { Link, NavLink } from "react-router-dom";
import useSettings from "../features/settings/useSettings.js";
import Toggle from "./Toggle.jsx";
import "./NavBar.css";

export default function NavBar() {
  const { blindMode, setBlindMode, theme, setTheme } = useSettings();

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
      <div className="nav-bar__controls">
        <Toggle label="Blind mode" checked={blindMode} onChange={setBlindMode} />
        <label className="nav-bar__theme">
          Theme
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </header>
  );
}