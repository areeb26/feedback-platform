import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  OrganizationSwitcher,
  SignInButton,
  useAuth,
  useOrganizationList,
} from "@clerk/react";
import { fetchTenantPublicBranding } from "../api/publicTenant";
import { fetchTenantShell } from "../api/tenant";
import type { TenantPublicBranding } from "@feedback-platform/shared";
import "./TenantGatePage.css";

type GateState =
  | { kind: "loading" }
  | { kind: "ready"; branding: TenantPublicBranding }
  | { kind: "not-found" };

type AccessState = "idle" | "checking" | "denied";

async function canAccessTenantShell(slug: string) {
  try {
    await fetchTenantShell(slug);
    return true;
  } catch {
    return false;
  }
}

export function TenantGatePage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: orgsLoaded, setActive, userMemberships } =
    useOrganizationList({
      userMemberships: { infinite: true },
    });
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [accessState, setAccessState] = useState<AccessState>("idle");

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    setAccessState("idle");

    fetchTenantPublicBranding(slug)
      .then((branding) => {
        if (!cancelled) {
          setState({ kind: "ready", branding });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: "not-found" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (
      !authLoaded ||
      !orgsLoaded ||
      !isSignedIn ||
      state.kind !== "ready" ||
      state.branding.status !== "active"
    ) {
      return;
    }

    let cancelled = false;
    setAccessState("checking");

    void (async () => {
      if (await canAccessTenantShell(slug)) {
        if (!cancelled) {
          navigate(`/t/${slug}/overview`, { replace: true });
        }
        return;
      }

      for (const membership of userMemberships.data ?? []) {
        await setActive({ organization: membership.organization.id });
        if (await canAccessTenantShell(slug)) {
          if (!cancelled) {
            navigate(`/t/${slug}/overview`, { replace: true });
          }
          return;
        }
      }

      if (!cancelled) {
        setAccessState("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoaded,
    isSignedIn,
    navigate,
    orgsLoaded,
    setActive,
    slug,
    state,
    userMemberships.data,
  ]);

  if (state.kind === "loading") {
    return <div className="tenant-gate">Loading…</div>;
  }

  if (state.kind === "not-found") {
    return (
      <div className="tenant-gate">
        <div className="tenant-gate__card">
          <h1 className="tenant-gate__title">Workspace not found</h1>
          <p className="tenant-gate__text">
            Check the link your agency sent you, or contact them for access.
          </p>
        </div>
      </div>
    );
  }

  const { branding } = state;
  const isSuspended = branding.status === "suspended";

  return (
    <div
      className="tenant-gate"
      style={
        {
          "--tenant-primary": branding.primaryColor,
        } as CSSProperties
      }
    >
      <div className="tenant-gate__card">
        <header className="tenant-gate__brand">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="tenant-gate__logo"
            />
          ) : (
            <div className="tenant-gate__mark" aria-hidden="true">
              {branding.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="tenant-gate__title">{branding.name}</h1>
        </header>

        {isSuspended ? (
          <p className="tenant-gate__text tenant-gate__text--paused">
            This workspace has been paused. Contact your agency to restore
            access.
          </p>
        ) : accessState === "checking" ? (
          <p className="tenant-gate__text">Opening your dashboard…</p>
        ) : accessState === "denied" ? (
          <>
            <p className="tenant-gate__text">
              You are signed in to the wrong workspace. Switch organization or
              sign out, then try again.
            </p>
            <div className="tenant-gate__recovery">
              <OrganizationSwitcher hidePersonal />
            </div>
          </>
        ) : (
          <>
            <p className="tenant-gate__text">
              Sign in to open your feedback and reputation dashboard.
            </p>
            <SignInButton mode="modal">
              <button type="button" className="tenant-gate__btn">
                Sign in
              </button>
            </SignInButton>
          </>
        )}
      </div>
    </div>
  );
}
