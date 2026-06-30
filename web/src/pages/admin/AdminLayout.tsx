import { Link, Outlet } from "react-router-dom";

export function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "#1e1e2e",
          color: "#fff",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 24 }}>Platform Admin</h1>
        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link to="/admin/tenants" style={{ color: "#fff" }}>
            Tenants
          </Link>
          <Link to="/admin/tenants/new" style={{ color: "#fff" }}>
            New Tenant
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32 }}>
        <Outlet />
      </main>
    </div>
  );
}
