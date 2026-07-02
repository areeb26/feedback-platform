import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AuthControls } from "../components/AuthControls";
import { apiFetch } from "../api/http";
import { fetchTenantProfile } from "../api/tenant";
import "./HomePage.css";

type HealthState = "loading" | "ok" | "error";

export function HomePage() {
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [health, setHealth] = useState<HealthState>("loading");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setHealth(data.status === "ok" ? "ok" : "error");
        setVersion(typeof data.version === "string" ? data.version : null);
      })
      .catch(() => setHealth("error"));
  }, []);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const adminResponse = await apiFetch("/api/admin/tenants");
      if (!cancelled && adminResponse.ok) {
        navigate("/admin/tenants", { replace: true });
        return;
      }

      try {
        const profile = await fetchTenantProfile();
        if (!cancelled) {
          navigate(`/t/${profile.slug}/overview`, { replace: true });
        }
      } catch {
        // Stay on the agency landing page.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn, navigate]);

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
          location — one branded dashboard per client. Access is agency-provisioned
          only.
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
        <div className="home__auth-bar">
          <p className="home__auth-label">Account</p>
          <AuthControls className="home__auth-controls" />
        </div>

        <div className="home__cards">
          <article className="home__card">
            <h2 className="home__card-title">Platform admin</h2>
            <p className="home__card-text">
              Onboard client workspaces, set branding, and hand over login
              credentials. Clients cannot self-register.
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
