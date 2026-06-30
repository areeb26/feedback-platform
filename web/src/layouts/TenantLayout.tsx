import { NavLink, Outlet, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchTenantShell, type TenantShell } from "../api/tenant";
import { SUPPORT_WHATSAPP_URL, tenantNavSections } from "../tenant/navigation";

export function TenantLayout() {
  const { slug = "" } = useParams();
  const [shell, setShell] = useState<TenantShell | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenantShell(slug)
      .then(setShell)
      .catch(() => setError("Could not load tenant"));
  }, [slug]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!shell) {
    return <div>Loading...</div>;
  }

  const sections = tenantNavSections(slug, shell.featureFlags);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 260,
          borderRight: "1px solid #e5e7eb",
          padding: 24,
          background: "#fafafa",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          {shell.logoUrl ? (
            <img src={shell.logoUrl} alt={shell.name} height={32} />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: shell.primaryColor,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {shell.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div style={{ fontWeight: 700, marginTop: 12 }}>{shell.name}</div>
        </div>

        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              {section.title}
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  style={({ isActive }) => ({
                    color: isActive ? shell.primaryColor : "#111827",
                    textDecoration: "none",
                    fontWeight: isActive ? 600 : 400,
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            padding: "16px 32px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">
            Contact Support
          </a>
        </header>
        <main style={{ padding: 32, flex: 1 }}>
          <Outlet context={{ shell }} />
        </main>
      </div>
    </div>
  );
}
