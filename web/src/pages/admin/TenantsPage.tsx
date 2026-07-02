import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { TenantFeatureFlags } from "@feedback-platform/shared";
import {
  fetchAdminTenants,
  updateAdminTenant,
  type AdminTenant,
} from "../../api/admin";

const featureFlagLabels: Array<{ key: keyof TenantFeatureFlags; label: string }> =
  [
    { key: "googleReviews", label: "Google Reviews" },
    { key: "aiReplies", label: "AI Replies" },
    { key: "competitorAnalytics", label: "Competitor Analytics" },
    { key: "socialListening", label: "Social Listening" },
  ];

export function TenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadTenants() {
    setTenants(await fetchAdminTenants());
  }

  useEffect(() => {
    loadTenants().catch(() => setError("Could not load tenants"));
  }, []);

  const editingTenant = tenants.find((tenant) => tenant.slug === editingSlug);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTenant) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const featureFlags = Object.fromEntries(
      featureFlagLabels.map(({ key }) => [key, form.get(key) === "on"]),
    ) as TenantFeatureFlags;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminTenant(editingTenant.slug, {
        name: String(form.get("name")),
        status: form.get("status") === "suspended" ? "suspended" : "active",
        primaryColor: String(form.get("primaryColor")),
        featureFlags,
      });
      setTenants((current) =>
        current.map((tenant) =>
          tenant.slug === updated.slug ? updated : tenant,
        ),
      );
      setEditingSlug(null);
    } catch {
      setError("Could not update tenant");
    } finally {
      setSaving(false);
    }
  }

  if (error && tenants.length === 0) {
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

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Slug</th>
            <th align="left">Status</th>
            <th align="left">Surveys</th>
            <th align="left">Submissions</th>
            <th align="left">Actions</th>
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
              <td>
                <button
                  type="button"
                  onClick={() =>
                    setEditingSlug((current) =>
                      current === tenant.slug ? null : tenant.slug,
                    )
                  }
                >
                  {editingSlug === tenant.slug ? "Close" : "Edit"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingTenant ? (
        <form
          onSubmit={handleSave}
          style={{
            marginTop: 32,
            maxWidth: 520,
            display: "grid",
            gap: 16,
            padding: 24,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
          }}
        >
          <h3>Edit {editingTenant.name}</h3>
          <label>
            Name
            <input
              name="name"
              defaultValue={editingTenant.name}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <label>
            Status
            <select
              name="status"
              defaultValue={editingTenant.status}
              style={{ display: "block", width: "100%" }}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label>
            Primary color
            <input
              name="primaryColor"
              defaultValue={editingTenant.primaryColor}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <fieldset>
            <legend>Feature flags</legend>
            <div style={{ display: "grid", gap: 8 }}>
              {featureFlagLabels.map(({ key, label }) => (
                <label key={key} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={editingTenant.featureFlags[key]}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <a href={`/t/${editingTenant.slug}`} target="_blank" rel="noreferrer">
              Open client entry
            </a>
          </div>
        </form>
      ) : null}
    </div>
  );
}
