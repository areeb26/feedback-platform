import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";

type OutletContext = { shell: TenantShell };

const BANNER_DISMISS_KEY = "social-listening-about-banner-dismissed";

function AboutDataBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "16px 20px",
        marginBottom: 24,
        position: "relative",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#3b82f6",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        i
      </span>
      <div style={{ flex: 1, paddingRight: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>About this data</div>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>
          Monitor public conversations about your business across social media
          platforms.
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>
          Results may be inaccurate or incomplete as we rely on third-party data
          sources and do not receive real-time updates.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#374151" }}>
          AI entity recognition and sentiment analysis are applied to the
          content, but may not always be accurate.
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          border: "none",
          background: "transparent",
          color: "#6b7280",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function SocialListeningPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { shell } = useOutletContext<OutletContext>();
  const [message, setMessage] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISS_KEY) === "true",
  );

  const enabled = shell.featureFlags.socialListening;

  useEffect(() => {
    if (!enabled) {
      navigate(`/t/${slug}/overview`, { replace: true });
    }
  }, [enabled, navigate, slug]);

  function handleDismissBanner() {
    localStorage.setItem(BANNER_DISMISS_KEY, "true");
    setBannerDismissed(true);
  }

  function handleRefresh() {
    setMessage("No data source configured");
  }

  if (!enabled) {
    return null;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            Social-Listening
          </div>
          <h1 style={{ margin: 0 }}>Social Listening</h1>
        </div>
        <button type="button" onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      {message ? <div style={{ marginBottom: 16 }}>{message}</div> : null}

      {!bannerDismissed ? (
        <AboutDataBanner onDismiss={handleDismissBanner} />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          minHeight: 480,
        }}
      >
        <div
          style={{
            borderRight: "1px solid #e5e7eb",
            padding: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Mentions</h2>
          <div
            style={{
              flex: 1,
              border: "2px dashed #d1d5db",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            No mentions found, contact support to get setup
          </div>
        </div>

        <div
          style={{
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
          }}
        >
          Select a mention to view details
        </div>
      </div>
    </div>
  );
}
