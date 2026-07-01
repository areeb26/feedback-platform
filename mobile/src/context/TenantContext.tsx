import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-expo";
import type { TenantProfile } from "@feedback-platform/shared";
import { fetchTenantProfile } from "../api/tenant";

type TenantContextValue = {
  profile: TenantProfile | null;
  slug: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { getToken, orgId } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tokenGetter = useCallback(async () => {
    return getToken();
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!orgId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchTenantProfile(tokenGetter);
      setProfile(next);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }, [orgId, tokenGetter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      profile,
      slug: profile?.slug ?? null,
      loading,
      error,
      refresh,
      getToken: tokenGetter,
    }),
    [profile, loading, error, refresh, tokenGetter],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}
