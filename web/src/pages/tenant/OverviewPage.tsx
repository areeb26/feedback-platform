import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import type { Location, OverviewQuery, TenantShell } from "@feedback-platform/shared";
import { fetchOverview, formatTrend, type Overview } from "../../api/overview";
import { fetchLocations } from "../../api/tenant";
import { fetchSurveys, type Survey } from "../../api/surveys";

type TenantOutletContext = {
  shell: TenantShell;
};

function monthRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function toDateInputValue(iso?: string) {
  return iso ? iso.slice(0, 10) : "";
}

function toFilterDate(value: string, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date.toISOString();
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

function SmileGauge({
  score,
  target,
  trend,
  primaryColor,
}: {
  score: number;
  target: number;
  trend: number;
  primaryColor: string;
}) {
  const belowTarget = Math.max(0, target - score);
  const arcPercent = Math.min(100, score);

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 600 }}>Smile Score</div>
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            background: "#f3f4f6",
          }}
        >
          Target: {target}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div
          style={{
            width: 180,
            height: 90,
            borderTopLeftRadius: 180,
            borderTopRightRadius: 180,
            background: `conic-gradient(${primaryColor} ${arcPercent * 1.8}deg, #e5e7eb 0deg)`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: 140,
              height: 70,
              borderTopLeftRadius: 140,
              borderTopRightRadius: 140,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {score}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "#dc2626" }}>{belowTarget} below target</span>
        <span style={{ color: trendColor(trend) }}>
          {formatTrend(trend)} vs previous period
        </span>
      </div>
    </div>
  );
}

function RatingBreakdown({
  breakdown,
  total,
  trend,
}: {
  breakdown: Overview["ratingBreakdown"];
  total: number;
  trend: number;
}) {
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
      <div style={{ fontWeight: 600, marginBottom: 16 }}>Rating Breakdown</div>
      {breakdown.map((row) => (
        <div
          key={row.stars}
          style={{
            display: "grid",
            gridTemplateColumns: "24px 1fr 48px 32px",
            gap: 12,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span>{row.stars}</span>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "#e5e7eb",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${row.percent}%`,
                height: "100%",
                background: "#3b82f6",
              }}
            />
          </div>
          <span style={{ fontSize: 13, color: "#6b7280" }}>{row.percent}%</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>{row.count}</span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginTop: 16,
          color: "#6b7280",
        }}
      >
        <span>{total} Total Ratings</span>
        <span style={{ color: trendColor(trend) }}>
          {formatTrend(trend)} vs previous period
        </span>
      </div>
    </div>
  );
}

function ThirdPartyReviews({
  sources,
}: {
  sources: Overview["thirdPartyReviews"];
}) {
  const totalReviews = sources.reduce(
    (sum, source) => sum + source.reviewCount,
    0,
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
      <div style={{ fontWeight: 600, marginBottom: 16 }}>3rd Party Reviews</div>
      {sources.map((source) => (
        <div
          key={source.source}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>{source.name}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              {source.reviewCount} reviews
            </div>
            {source.errorMessage ? (
              <div style={{ fontSize: 12, color: "#dc2626" }}>
                {source.errorMessage}
              </div>
            ) : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>
              {source.averageRating.toFixed(1)}
            </div>
            <div style={{ fontSize: 13, color: trendColor(source.trend) }}>
              {formatTrend(source.trend)}
            </div>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 13, color: "#6b7280" }}>
        {totalReviews} Total Reviews
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { slug = "" } = useParams();
  const { shell } = useOutletContext<TenantOutletContext>();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OverviewQuery>(() => monthRange());
  const [locationId, setLocationId] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [labelQuery, setLabelQuery] = useState("");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    Promise.all([fetchLocations(slug), fetchSurveys(slug)]).then(
      ([nextLocations, nextSurveys]) => {
        setLocations(nextLocations);
        setSurveys(nextSurveys);
      },
    ).catch(() => setError("Could not load overview filters"));
  }, [slug]);

  useEffect(() => {
    let ignore = false;
    fetchOverview(slug, {
      ...filters,
      locationId: locationId || undefined,
      surveyId: surveyId || undefined,
      label: labelQuery.trim() || undefined,
    })
      .then((nextOverview) => {
        if (!ignore) {
          setOverview(nextOverview);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError("Could not load overview");
        }
      });
    return () => {
      ignore = true;
    };
  }, [slug, filters, locationId, surveyId, labelQuery]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!overview) {
    return <div>Loading...</div>;
  }

  const filteredLocations = labelQuery
    ? locations.filter((location) =>
        location.labels.some((label) =>
          label.toLowerCase().includes(labelQuery.toLowerCase()),
        ),
      )
    : locations;

  const isEmpty =
    overview.submissions === 0 &&
    overview.totalIncidents === 0 &&
    overview.smileScore === 0;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>
        {greeting}, {shell.name}
      </h1>

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
                startDate: toFilterDate(event.target.value),
              }))
            }
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>To</span>
          <input
            type="date"
            value={toDateInputValue(filters.endDate)}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: toFilterDate(event.target.value, true),
              }))
            }
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Location</span>
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
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Survey</span>
          <select
            value={surveyId}
            onChange={(event) => setSurveyId(event.target.value)}
          >
            <option value="">All surveys</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Labels</span>
          <input
            type="search"
            placeholder="Search labels"
            value={labelQuery}
            onChange={(event) => setLabelQuery(event.target.value)}
          />
        </label>
      </div>

      {isEmpty ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: "1px dashed #d1d5db",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          <p>No feedback data yet for this period.</p>
          <p style={{ fontSize: 14 }}>
            Share a survey link or wait for customer submissions to appear here.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <KpiCard
              title="Smile Score"
              value={String(overview.smileScore)}
              trend={overview.smileScoreTrend}
              accent={shell.primaryColor}
            />
            <KpiCard
              title="Submissions"
              value={String(overview.submissions)}
              trend={overview.submissionsTrend}
              accent="#8b5cf6"
            />
            <KpiCard
              title="Total Incidents"
              value={String(overview.totalIncidents)}
              trend={overview.totalIncidentsTrend}
              accent="#f59e0b"
            />
            <KpiCard
              title="Resolved"
              value={`${overview.resolvedPercent}%`}
              trend={overview.resolvedPercentTrend}
              accent="#22c55e"
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <SmileGauge
              score={overview.smileScore}
              target={overview.targetSmileScore}
              trend={overview.smileScoreTrend}
              primaryColor={shell.primaryColor}
            />
            <RatingBreakdown
              breakdown={overview.ratingBreakdown}
              total={overview.submissions}
              trend={overview.submissionsTrend}
            />
            <ThirdPartyReviews sources={overview.thirdPartyReviews} />
          </div>
        </>
      )}
    </div>
  );
}
