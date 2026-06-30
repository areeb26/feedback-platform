import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { completeGoogleCallback } from "../api/google";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasStarted = useRef(false);
  const [message, setMessage] = useState("Completing Google connection...");

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const expectedState = window.sessionStorage.getItem("google_oauth_state");
    const slug = window.sessionStorage.getItem("google_oauth_tenant_slug");

    if (oauthError) {
      setMessage(`Google authorization failed: ${oauthError}`);
      return;
    }
    if (!code || !state || !slug) {
      setMessage("Missing Google OAuth callback details.");
      return;
    }
    if (expectedState && expectedState !== state) {
      setMessage("Google OAuth state did not match. Please try connecting again.");
      return;
    }

    completeGoogleCallback(slug, { code, state })
      .then(() => {
        window.sessionStorage.removeItem("google_oauth_state");
        window.sessionStorage.removeItem("google_oauth_tenant_slug");
        navigate(`/t/${slug}/reviews`, { replace: true });
      })
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not complete Google connection.",
        );
      });
  }, [navigate, searchParams]);

  const slug = window.sessionStorage.getItem("google_oauth_tenant_slug");

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <h1>Google Reviews</h1>
      <p>{message}</p>
      {slug ? <Link to={`/t/${slug}/reviews`}>Back to reviews</Link> : null}
    </main>
  );
}
