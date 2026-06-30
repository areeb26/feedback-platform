import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminTenant } from "../../api/admin";

export function CreateTenantPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      await createAdminTenant({
        name: String(form.get("name")),
        slug: String(form.get("slug")),
        primaryColor: String(form.get("primaryColor")),
        adminEmail: String(form.get("adminEmail")),
      });
      navigate("/admin/tenants");
    } catch {
      setError("Could not create tenant");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>New Tenant</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <label>
          Business name
          <input name="name" required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Slug
          <input name="slug" required style={{ display: "block", width: "100%" }} />
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
          Admin email
          <input
            name="adminEmail"
            type="email"
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        {error ? <p>{error}</p> : null}
        <button type="submit" disabled={submitting}>
          Create tenant
        </button>
      </form>
    </div>
  );
}
