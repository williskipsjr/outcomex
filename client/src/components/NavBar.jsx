import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <header>
      <nav aria-label="Main">
        <NavLink to="/" end>
          OutcomeX
        </NavLink>
        <NavLink to="/" end>
          Live
        </NavLink>
        <NavLink to="/practice">Practice</NavLink>
        <NavLink to="/me">My Calls</NavLink>
        <NavLink to="/about">About</NavLink>
      </nav>
    </header>
  );
}
