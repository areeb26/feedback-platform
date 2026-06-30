import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";
import {
  createCompetitor,
  deleteCompetitor,
  fetchCompetitorAnalytics,
  fetchCompetitors,
  refreshCompetitors,
  type Competitor,
  type CompetitorAnalytics,
} from "../../api/competitors";

type OutletContext = { shell: TenantShell };

function monthRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function last30DaysRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function scoreColor(score: number | null) {
  if (score == null) return "#9ca3af";
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#ea580c";
  return "#dc2626";
}

function ScoreCell({
  score,
  reviewCount,
  highlight,
}: {
  score: number | null;
  reviewCount: number | null;
  highlight?: boolean;
}) {
  if (score == null) {
    return <span style={{ color: "#9ca3af" }}>-</span>;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 12px",
        background: highlight ? "#ecfdf5" : "#fff",
        borderLeft: `4px solid ${scoreColor(score)}`,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 18 }}>{score}</span>
      {reviewCount != null ? (
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span aria-hidden="true">📣</span>
          {reviewCount}
        </span>
      ) : null}
    </div>
  );
}

function rankLabel(row: CompetitorAnalytics["categories"][number]) {
  if (row.isLeading) {
    return "You're leading!";
  }
  if (row.rank != null && row.leaderName) {
    return `#${row.rank} • Leader: ${row.leaderName}`;
  }
  return null;
}

export function CompetitorAnalyticsPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { shell } = useOutletContext<OutletContext>();
  const [range, setRange] = useState(monthRange);
  const [search, setSearch] = useState("");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<CompetitorAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPlaceId, setNewPlaceId] = useState("");

  const enabled = shell.featureFlags.competitorAnalytics;

  useEffect(() => {
    if (!enabled) {
      navigate(`/t/${slug}/overview`, { replace: true });
    }
  }, [enabled, navigate, slug]);

  async function loadData() {
    const [competitorRows, analyticsData] = await Promise.all([
      fetchCompetitors(slug),
      fetchCompetitorAnalytics(slug, {
        competitorIds: selectedIds.length
          ? selectedIds.join(",")
          : undefined,
        search: search || undefined,
      }),
    ]);
    setCompetitors(competitorRows);
    setAnalytics(analyticsData);
    if (selectedIds.length === 0) {
      setSelectedIds(competitorRows.map((row) => row.id));
    }
  }

  useEffect(() => {
    if (!enabled) return;
    loadData().catch(() => setError("Could not load competitor analytics"));
  }, [slug, enabled, search, selectedIds.join(",")]);

  const selectedCount = useMemo(() => {
    if (selectedIds.length === 0) return competitors.length;
    return selectedIds.length;
  }, [competitors.length, selectedIds.length]);

  const visibleCategories = useMemo(() => {
    if (!analytics) return [];
    if (showAllCategories) return analytics.categories;
    return analytics.categories.slice(0, 1);
  }, [analytics, showAllCategories]);

  async function handleRefresh() {
    try {
      const result = await refreshCompetitors(slug);
      setMessage(`Refreshed ${result.refreshed} competitors from Google Places.`);
      await loadData();
    } catch (refreshError) {
      setMessage(
        refreshError instanceof Error
          ? refreshError.message
          : "Refresh failed",
      );
    }
  }

  async function handleAddCompetitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createCompetitor(slug, { name: newName, placeId: newPlaceId });
      setNewName("");
      setNewPlaceId("");
      await loadData();
    } catch {
      setMessage("Could not add competitor");
    }
  }

  async function handleDeleteCompetitor(competitorId: string) {
    await deleteCompetitor(slug, competitorId);
    setSelectedIds((current) => current.filter((id) => id !== competitorId));
    await loadData();
  }

  if (!enabled) {
    return null;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!analytics) {
    return <div>Loading...</div>;
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
            Analytics / Competitors
          </div>
          <h1 style={{ margin: 0 }}>Competitor Analytics</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={handleRefresh}>
            Refresh
          </button>
          <button type="button" onClick={() => setShowCompetitors((open) => !open)}>
            Competitors
          </button>
        </div>
      </div>

      {message ? <div style={{ marginBottom: 16 }}>{message}</div> : null}

      {showCompetitors ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Manage Competitors</h2>
          <form
            onSubmit={handleAddCompetitor}
            style={{ display: "flex", gap: 12, marginBottom: 16 }}
          >
            <input
              placeholder="Competitor name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              required
            />
            <input
              placeholder="Google Place ID"
              value={newPlaceId}
              onChange={(event) => setNewPlaceId(event.target.value)}
              required
            />
            <button type="submit">Add</button>
          </form>
          {competitors.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No competitors added yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {competitors.map((competitor) => (
                <li
                  key={competitor.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span>
                    {competitor.name} ({competitor.placeId})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCompetitor(competitor.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Search Listings..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ minWidth: 220 }}
        />
        <select
          multiple
          value={selectedIds}
          onChange={(event) =>
            setSelectedIds(
              Array.from(event.target.selectedOptions, (option) => option.value),
            )
          }
          style={{ minWidth: 220, minHeight: 40 }}
        >
          {competitors.map((competitor) => (
            <option key={competitor.id} value={competitor.id}>
              {competitor.name}
            </option>
          ))}
        </select>
        <span style={{ alignSelf: "center", color: "#6b7280" }}>
          {selectedCount} selected
        </span>
        <button type="button" onClick={() => setRange(last30DaysRange())}>
          Last 30 Days
        </button>
        <input
          type="date"
          value={toDateInputValue(range.startDate)}
          onChange={(event) =>
            setRange((current) => ({
              ...current,
              startDate: new Date(event.target.value).toISOString(),
            }))
          }
        />
        <input
          type="date"
          value={toDateInputValue(range.endDate)}
          onChange={(event) =>
            setRange((current) => ({
              ...current,
              endDate: new Date(event.target.value).toISOString(),
            }))
          }
        />
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          background: "#fff",
          marginBottom: 16,
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>
              Performance Categories Smile Scores
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
              Comparison of your business&apos;s performance categories against
              competitors
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#374151",
              }}
            >
              <input
                type="checkbox"
                checked={showAllCategories}
                onChange={(event) => setShowAllCategories(event.target.checked)}
              />
              Show all categories
            </label>
            <button type="button" disabled>
              Labels
            </button>
            <select defaultValue="all" aria-label="Show All">
              <option value="all">Show All</option>
            </select>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 8px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Categories
              </th>
              {analytics.columns.map((column) => (
                <th
                  key={column.id}
                  style={{
                    textAlign: "left",
                    padding: "12px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    background: column.isOwnBusiness ? "#eff6ff" : undefined,
                  }}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleCategories.map((row) => {
              const leaderScore = Math.max(
                ...row.cells
                  .map((cell) => cell.score ?? -1)
                  .filter((score) => score >= 0),
              );

              return (
                <tr key={row.category}>
                  <td
                    style={{
                      padding: "16px 8px",
                      borderBottom: "1px solid #f3f4f6",
                      verticalAlign: "top",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{row.category}</div>
                    {rankLabel(row) ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: row.isLeading ? "#16a34a" : "#6b7280",
                          marginTop: 4,
                        }}
                      >
                        {rankLabel(row)}
                      </div>
                    ) : null}
                  </td>
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.category}-${analytics.columns[index]?.id ?? index}`}
                      style={{
                        padding: "16px 8px",
                        borderBottom: "1px solid #f3f4f6",
                        background: analytics.columns[index]?.isOwnBusiness
                          ? "#eff6ff"
                          : undefined,
                      }}
                    >
                      <ScoreCell
                        score={cell.score}
                        reviewCount={cell.reviewCount}
                        highlight={
                          cell.score != null && cell.score === leaderScore
                        }
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 18 }}>Brand Drilldown</div>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Detailed brand-level insights will appear here in a future release.
        </p>
      </div>
    </div>
  );
}
