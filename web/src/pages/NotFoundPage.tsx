import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="home" style={{ minHeight: "100vh", justifyContent: "center" }}>
      <section className="home__panel" style={{ maxWidth: 480 }}>
        <h1 className="home__headline" style={{ fontSize: "2rem" }}>
          Page not found
        </h1>
        <p className="home__lede">
          That link does not match anything in Feedback Platform.
        </p>
        <Link to="/" className="home__btn home__btn--primary">
          Back to home
        </Link>
      </section>
    </div>
  );
}
