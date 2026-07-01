import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./HomePage.css";

type HealthState = "loading" | "ok" | "error";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function HomePage() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthState>("loading");
  const [version, setVersion] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setHealth(data.status === "ok" ? "ok" : "error");
        setVersion(typeof data.version === "string" ? data.version : null);
      })
      .catch(() => setHealth("error"));
  }, []);

  function openTenantDashboard(event: FormEvent) {
    event.preventDefault();
    const slug = normalizeSlug(tenantSlug);
    if (!slug) return;
    navigate(`/t/${slug}/overview`);
  }

  const statusLabel =
    health === "loading"
      ? "Checking system…"
      : health === "ok"
        ? `System online${version ? ` · v${version}` : ""}`
        : "API unreachable";

  return (
    <div className="home">
      <section className="home__intro" aria-labelledby="home-headline">
        <div className="home__mark">
          <div className="home__logo" aria-hidden="true">
            F
          </div>
          <span className="home__product">Feedback Platform</span>
        </div>

        <h1 id="home-headline" className="home__headline">
          Reputation that feels cared for.
        </h1>
        <p className="home__lede">
          Collect feedback, resolve incidents, and manage reviews across every
          location — one dashboard per brand.
        </p>

        <div className="home__stats" aria-label="Platform capabilities">
          <div className="home__stat">
            <span className="home__stat-value">Surveys</span>
            <span className="home__stat-label">Public feedback forms</span>
          </div>
          <div className="home__stat">
            <span className="home__stat-value">Incidents</span>
            <span className="home__stat-label">Auto-tracked issues</span>
          </div>
          <div className="home__stat">
            <span className="home__stat-value">Reviews</span>
            <span className="home__stat-label">Google &amp; more</span>
          </div>
        </div>
      </section>

      <section className="home__panel" aria-label="Sign in options">
        <div className="home__cards">
          <article className="home__card">
            <h2 className="home__card-title">Tenant dashboard</h2>
            <p className="home__card-text">
              Open your brand workspace. Enter the slug your agency assigned
              (e.g. <code>hafiz-sweets</code>).
            </p>
            <form className="home__slug-row" onSubmit={openTenantDashboard}>
              <label htmlFor="tenant-slug" className="sr-only">
                Tenant slug
              </label>
              <input
                id="tenant-slug"
                className="home__input"
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value)}
                placeholder="your-brand-slug"
                autoComplete="organization"
                spellCheck={false}
              />
              <button
                type="submit"
                className="home__btn home__btn--primary"
                aria-label="Open tenant dashboard"
              >
                Open
              </button>
            </form>
          </article>

          <article className="home__card">
            <h2 className="home__card-title">Platform admin</h2>
            <p className="home__card-text">
              Onboard tenants, manage branding, and control feature flags for
              agency clients.
            </p>
            <Link to="/admin/tenants" className="home__btn home__btn--ghost">
              Super-admin panel
            </Link>
          </article>
        </div>
      </section>

      <footer className="home__footer" aria-live="polite">
        <span
          className={`home__status-dot ${
            health === "ok"
              ? "home__status-dot--ok"
              : health === "error"
                ? "home__status-dot--error"
                : ""
          }`}
          aria-hidden="true"
        />
        <span>{statusLabel}</span>
      </footer>
    </div>
  );
}
