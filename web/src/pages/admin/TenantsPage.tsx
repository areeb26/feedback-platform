import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminTenants, type AdminTenant } from "../../api/admin";

export function TenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTenants()
      .then(setTenants)
      .catch(() => setError("Could not load tenants"));
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h2>Tenants</h2>
        <Link to="/admin/tenants/new">+ New Tenant</Link>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Slug</th>
            <th align="left">Status</th>
            <th align="left">Surveys</th>
            <th align="left">Submissions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.slug}>
              <td>{tenant.name}</td>
              <td>{tenant.slug}</td>
              <td>{tenant.status}</td>
              <td>{tenant.usage.surveys}</td>
              <td>{tenant.usage.submissions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
