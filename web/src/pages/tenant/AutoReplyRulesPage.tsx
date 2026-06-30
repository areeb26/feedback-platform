import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";
import {
  createAutoReplyRule,
  deleteAutoReplyRule,
  fetchAutoReplyRules,
  updateAutoReplyRule,
  type AutoReplyRule,
} from "../../api/aiReplies";

type OutletContext = { shell: TenantShell };

export function AutoReplyRulesPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { shell } = useOutletContext<OutletContext>();
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [maxRating, setMaxRating] = useState("3");
  const [templateText, setTemplateText] = useState(
    "Hi {reviewerName}, thank you for your {rating}-star review.",
  );
  const [enabled, setEnabled] = useState(true);

  const aiEnabled = shell.featureFlags.aiReplies;

  useEffect(() => {
    if (!aiEnabled) {
      navigate(`/t/${slug}/overview`, { replace: true });
    }
  }, [aiEnabled, navigate, slug]);

  async function loadRules() {
    setRules(await fetchAutoReplyRules(slug));
  }

  useEffect(() => {
    if (!aiEnabled) return;
    loadRules().catch(() => setError("Could not load auto-reply rules"));
  }, [slug, aiEnabled]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createAutoReplyRule(slug, {
      name: name.trim() || undefined,
      maxRating: Number(maxRating),
      templateText: templateText.trim(),
      enabled,
    });
    setName("");
    await loadRules();
  }

  async function handleToggle(rule: AutoReplyRule) {
    await updateAutoReplyRule(slug, rule.id, { enabled: !rule.enabled });
    await loadRules();
  }

  async function handleDelete(ruleId: string) {
    if (!window.confirm("Delete this auto-reply rule?")) return;
    await deleteAutoReplyRule(slug, ruleId);
    await loadRules();
  }

  if (!aiEnabled) {
    return null;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Auto Reply Rules</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Rules apply to incoming reviews when rating is at or below the threshold.
        Use {"{reviewerName}"} and {"{rating}"} in templates.
      </p>

      <form
        onSubmit={handleCreate}
        style={{
          display: "grid",
          gap: 12,
          maxWidth: 560,
          marginBottom: 32,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>New rule</h2>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Rule name (optional)"
        />
        <label>
          Max rating
          <select
            value={maxRating}
            onChange={(event) => setMaxRating(event.target.value)}
            style={{ display: "block", marginTop: 4 }}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={String(value)}>
                {value} star{value === 1 ? "" : "s"} and below
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={templateText}
          onChange={(event) => setTemplateText(event.target.value)}
          rows={4}
          placeholder="Reply template"
          required
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enabled
        </label>
        <button type="submit">Create rule</button>
      </form>

      {rules.length === 0 ? (
        <div style={{ color: "#6b7280" }}>No auto-reply rules yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "8px 12px" }}>Name</th>
              <th style={{ padding: "8px 12px" }}>Max rating</th>
              <th style={{ padding: "8px 12px" }}>Template</th>
              <th style={{ padding: "8px 12px" }}>Enabled</th>
              <th style={{ padding: "8px 12px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px" }}>{rule.name ?? "—"}</td>
                <td style={{ padding: "12px" }}>{rule.maxRating}</td>
                <td style={{ padding: "12px", maxWidth: 360 }}>{rule.templateText}</td>
                <td style={{ padding: "12px" }}>{rule.enabled ? "Yes" : "No"}</td>
                <td style={{ padding: "12px", display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleToggle(rule)}>
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" onClick={() => handleDelete(rule.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
