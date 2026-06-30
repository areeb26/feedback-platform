import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { completeGoogleCallback } from "../api/google";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("Completing Google connection...");

  useEffect(() => {
    async function completeConnection() {
      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const state = params.get("state");
      const storedState = window.sessionStorage.getItem("google_oauth_state");
      const slug = window.sessionStorage.getItem("google_oauth_slug");
      const returnTo = window.sessionStorage.getItem("google_oauth_return_to");

      if (!code || !state || !storedState || !slug || state !== storedState) {
        setMessage("Could not verify Google connection state.");
        return;
      }

      try {
        await completeGoogleCallback(slug, { code, state });
        window.sessionStorage.removeItem("google_oauth_state");
        window.sessionStorage.removeItem("google_oauth_slug");
        window.sessionStorage.removeItem("google_oauth_return_to");
        navigate(returnTo ?? `/t/${slug}/reviews`, { replace: true });
      } catch {
        setMessage("Could not complete Google connection.");
      }
    }

    completeConnection();
  }, [location.search, navigate]);

  return <div>{message}</div>;
}
