import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>
        That page does not exist. <Link to="/">Go back to live markets</Link>.
      </p>
    </section>
  );
}
