import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Location } from "@feedback-platform/shared";
import {
  exportStaffPerformanceCsv,
  fetchIncidentAnalytics,
  formatDuration,
  formatTrend,
  type IncidentAnalytics,
} from "../../api/incidentAnalytics";
import { fetchLocations } from "../../api/tenant";

function monthRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

function trendColor(value: number) {
  if (value > 0) return "#16a34a";
  if (value < 0) return "#dc2626";
  return "#6b7280";
}

function KpiCard({
  title,
  value,
  trend,
  accent,
}: {
  title: string;
  value: string;
  trend: number;
  accent: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 180,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ color: "#6b7280", fontSize: 14 }}>{title}</div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: accent,
            opacity: 0.15,
          }}
        />
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 13, color: trendColor(trend), marginTop: 8 }}>
        {formatTrend(trend)} vs previous period
      </div>
    </div>
  );
}

function NewIncidentsChart({
  data,
}: {
  data: IncidentAnalytics["newIncidentsByDate"];
}) {
  const max = Math.max(
    1,
    ...data.map((row) => row.oneStar + row.twoStar + row.threeStar),
  );

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        background: "#fff",
        flex: 1,
      }}
    >
      <div style={{ fontWeight: 600 }}>New Incidents</div>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
        Incident breakdown by severity over time
      </p>
      {data.length === 0 ? (
        <p style={{ color: "#9ca3af", marginTop: 24 }}>No incidents in period</p>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 180,
            marginTop: 24,
          }}
        >
          {data.map((row) => {
            const total = row.oneStar + row.twoStar + row.threeStar;
            return (
              <div
                key={row.date}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column-reverse",
                    height: 140,
                    justifyContent: "flex-start",
                  }}
                >
                  {row.threeStar > 0 ? (
                    <div
                      style={{
                        height: `${(row.threeStar / max) * 100}%`,
                        background: "#eab308",
                        borderRadius: "4px 4px 0 0",
                      }}
                      title={`3-star: ${row.threeStar}`}
                    />
                  ) : null}
                  {row.twoStar > 0 ? (
                    <div
                      style={{
                        height: `${(row.twoStar / max) * 100}%`,
                        background: "#f97316",
                      }}
                      title={`2-star: ${row.twoStar}`}
                    />
                  ) : null}
                  {row.oneStar > 0 ? (
                    <div
                      style={{
                        height: `${(row.oneStar / max) * 100}%`,
                        background: "#ef4444",
                        borderRadius: row.twoStar + row.threeStar === 0 ? "4px 4px 0 0" : 0,
                      }}
                      title={`1-star: ${row.oneStar}`}
                    />
                  ) : null}
                </div>
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {row.date.slice(5)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{total}</span>
              </div>
            );
          })}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <span>
          <span style={{ color: "#ef4444" }}>■</span> One Star
        </span>
        <span>
          <span style={{ color: "#f97316" }}>■</span> Two Star
        </span>
        <span>
          <span style={{ color: "#eab308" }}>■</span> Three Star
        </span>
      </div>
    </div>
  );
}

function ResponseTimeChart({
  data,
}: {
  data: IncidentAnalytics["responseTimeTrend"];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((row) => [
      row.avgReviewTimeMinutes,
      row.avgResolveTimeMinutes,
    ]),
  );

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        background: "#fff",
        flex: 1,
      }}
    >
      <div style={{ fontWeight: 600 }}>Average Review & Resolve Times</div>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
        Response time trends over the selected period
      </p>
      {data.length === 0 ? (
        <p style={{ color: "#9ca3af", marginTop: 24 }}>No response data yet</p>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            height: 180,
            marginTop: 24,
          }}
        >
          {data.map((row) => (
            <div
              key={row.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 140,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: "20%",
                    width: "25%",
                    height: `${(row.avgReviewTimeMinutes / max) * 100}%`,
                    background: "rgba(34, 197, 94, 0.35)",
                    borderTop: "2px solid #22c55e",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: "20%",
                    width: "25%",
                    height: `${(row.avgResolveTimeMinutes / max) * 100}%`,
                    background: "rgba(234, 179, 8, 0.35)",
                    borderTop: "2px solid #eab308",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {row.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <span>
          <span style={{ color: "#22c55e" }}>■</span> Avg Review Time
        </span>
        <span>
          <span style={{ color: "#eab308" }}>■</span> Avg Resolve Time
        </span>
      </div>
    </div>
  );
}

export function IncidentAnalyticsPage() {
  const { slug = "" } = useParams();
  const [analytics, setAnalytics] = useState<IncidentAnalytics | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(() => monthRange());
  const [locationId, setLocationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  async function loadAnalytics() {
    setAnalytics(
      await fetchIncidentAnalytics(slug, {
        ...filters,
        locationId: locationId || undefined,
      }),
    );
  }

  useEffect(() => {
    fetchLocations(slug).then(setLocations).catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    loadAnalytics().catch(() => setError("Could not load incident analytics"));
  }, [slug, filters, locationId]);

  const filteredLocations = locationQuery
    ? locations.filter((location) =>
        location.name.toLowerCase().includes(locationQuery.toLowerCase()),
      )
    : locations;

  function handleExport() {
    if (!analytics) return;
    const csv = exportStaffPerformanceCsv(analytics.staffPerformance);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "staff-performance.csv";
    link.click();
    URL.revokeObjectURL(url);
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
        <h1>Incident Analytics</h1>
        <button type="button" onClick={() => loadAnalytics()}>
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>From</span>
          <input
            type="date"
            value={toDateInputValue(filters.startDate)}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: new Date(event.target.value).toISOString(),
              }))
            }
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>To</span>
          <input
            type="date"
            value={toDateInputValue(filters.endDate)}
            onChange={(event) => {
              const end = new Date(event.target.value);
              end.setHours(23, 59, 59, 999);
              setFilters((current) => ({
                ...current,
                endDate: end.toISOString(),
              }));
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Location</span>
          <input
            type="search"
            placeholder="Search locations"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Select</span>
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            <option value="">All locations</option>
            {filteredLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <KpiCard
          title="Total Incidents"
          value={String(analytics.totalIncidents)}
          trend={analytics.totalIncidentsTrend}
          accent="#f59e0b"
        />
        <KpiCard
          title="Resolved Incidents"
          value={String(analytics.resolvedIncidents)}
          trend={analytics.resolvedIncidentsTrend}
          accent="#22c55e"
        />
        <KpiCard
          title="Avg Review Time"
          value={formatDuration(analytics.avgReviewTimeMinutes)}
          trend={analytics.avgReviewTimeTrend}
          accent="#22c55e"
        />
        <KpiCard
          title="Avg Resolve Time"
          value={formatDuration(analytics.avgResolveTimeMinutes)}
          trend={analytics.avgResolveTimeTrend}
          accent="#eab308"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <NewIncidentsChart data={analytics.newIncidentsByDate} />
        <ResponseTimeChart data={analytics.responseTimeTrend} />
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Staff Performance</div>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              Individual staff member incident handling metrics
            </p>
          </div>
          <button type="button" onClick={handleExport}>
            Export
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Staff Member</th>
              <th align="left">Submissions</th>
              <th align="left">Incidents Created</th>
              <th align="left">Reviewed</th>
              <th align="left">Resolved</th>
              <th align="left">Avg Review</th>
              <th align="left">Avg Resolve</th>
              <th align="left">% Resolved</th>
            </tr>
          </thead>
          <tbody>
            {analytics.staffPerformance.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "#9ca3af", paddingTop: 16 }}>
                  No staff assignments in this period
                </td>
              </tr>
            ) : (
              analytics.staffPerformance.map((row) => (
                <tr key={row.staffMember}>
                  <td>{row.staffMember}</td>
                  <td>{row.submissions}</td>
                  <td>{row.incidentsCreated}</td>
                  <td>{row.reviewed}</td>
                  <td>{row.resolved}</td>
                  <td>{formatDuration(row.avgReviewMinutes)}</td>
                  <td>{formatDuration(row.avgResolveMinutes)}</td>
                  <td>{row.percentResolved}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
