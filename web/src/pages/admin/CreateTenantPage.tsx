import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createAdminTenant } from "../../api/admin";

type HandoverDetails = {
  name: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
  clientEntryPath: string;
};

function buildEntryUrl(path: string) {
  return `${window.location.origin}${path}`;
}

export function CreateTenantPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [handover, setHandover] = useState<HandoverDetails | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const adminPassword = String(form.get("adminPassword"));
    const payload = {
      name: String(form.get("name")),
      slug: String(form.get("slug")),
      primaryColor: String(form.get("primaryColor")),
      adminEmail: String(form.get("adminEmail")),
      adminPassword,
    };

    try {
      const tenant = await createAdminTenant(payload);
      setHandover({
        name: tenant.name,
        slug: tenant.slug,
        adminEmail: tenant.adminEmail,
        adminPassword,
        clientEntryPath: tenant.clientEntryPath,
      });
    } catch {
      setError("Could not create tenant");
      setSubmitting(false);
    }
  }

  if (handover) {
    const entryUrl = buildEntryUrl(handover.clientEntryPath);
    return (
      <div style={{ maxWidth: 560 }}>
        <h2>Client workspace ready</h2>
        <p>
          Share these details with <strong>{handover.name}</strong>. Accounts are
          agency-provisioned only — clients cannot sign up on their own.
        </p>
        <dl style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <div>
            <dt style={{ fontWeight: 600 }}>Branded entry URL</dt>
            <dd>
              <a href={entryUrl}>{entryUrl}</a>
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Login email</dt>
            <dd>{handover.adminEmail}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Password</dt>
            <dd>
              <code>{handover.adminPassword}</code>
            </dd>
          </div>
        </dl>
        <p style={{ marginTop: 16, color: "#6b7280" }}>
          Save this password now. It is not stored in the platform after you
          leave this page.
        </p>
        <Link to="/admin/tenants" style={{ display: "inline-block", marginTop: 16 }}>
          Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2>New client workspace</h2>
      <p style={{ maxWidth: 520, color: "#4b5563" }}>
        Creates a branded tenant app, Clerk organization, and client login. You
        hand over the entry URL, email, and password — clients cannot register
        themselves.
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginTop: 24 }}>
        <label>
          Business name
          <input name="name" required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Slug
          <input
            name="slug"
            required
            placeholder="hafiz-sweets"
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Primary color
          <input
            name="primaryColor"
            defaultValue="#7c3aed"
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Client login email
          <input
            name="adminEmail"
            type="email"
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Client password
          <input
            name="adminPassword"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            style={{ display: "block", width: "100%" }}
          />
        </label>
        {error ? <p>{error}</p> : null}
        <button type="submit" disabled={submitting}>
          Create client workspace
        </button>
      </form>
    </div>
  );
}
