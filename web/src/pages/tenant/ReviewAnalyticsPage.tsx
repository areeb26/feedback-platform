import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchReviewAnalytics,
  formatTrend,
  type ReviewAnalytics,
} from "../../api/reviewAnalytics";

type BreakdownRow = ReviewAnalytics["listingsBreakdown"][number];

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
  subtitle,
}: {
  title: string;
  value: string;
  trend?: number;
  subtitle?: string;
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
      <div style={{ color: "#6b7280", fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{value}</div>
      {trend !== undefined ? (
        <div style={{ fontSize: 13, color: trendColor(trend), marginTop: 8 }}>
          {formatTrend(trend)} from last period
        </div>
      ) : null}
      {subtitle ? (
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function RatingsChart({ data }: { data: ReviewAnalytics["ratingsByDate"] }) {
  const max = Math.max(
    1,
    ...data.map((row) => row.one + row.two + row.three + row.four + row.five),
  );

  const colors = {
    one: "#ef4444",
    two: "#f97316",
    three: "#eab308",
    four: "#86efac",
    five: "#22c55e",
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 24,
        background: "#fff",
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 600 }}>Review Ratings</div>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
        Distribution of customer review ratings over the selected period
      </p>
      {data.length === 0 ? (
        <p style={{ color: "#9ca3af", marginTop: 24 }}>No reviews in period</p>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 200,
            marginTop: 24,
            overflowX: "auto",
          }}
        >
          {data.map((row) => {
            const segments = [
              { key: "one", count: row.one },
              { key: "two", count: row.two },
              { key: "three", count: row.three },
              { key: "four", count: row.four },
              { key: "five", count: row.five },
            ] as const;

            return (
              <div
                key={row.date}
                style={{
                  minWidth: 48,
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
                    height: 160,
                    display: "flex",
                    flexDirection: "column-reverse",
                  }}
                >
                  {segments.map((segment) =>
                    segment.count > 0 ? (
                      <div
                        key={segment.key}
                        style={{
                          height: `${(segment.count / max) * 100}%`,
                          background: colors[segment.key],
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {row.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 16,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <span>Terrible (1)</span>
        <span>Poor (2)</span>
        <span>Average (3)</span>
        <span>Good (4)</span>
        <span>Excellent (5)</span>
      </div>
    </div>
  );
}

function sortRows(rows: BreakdownRow[], sortBy: string) {
  const next = [...rows];
  if (sortBy === "highest_rating") {
    next.sort((left, right) => right.rating - left.rating);
  } else if (sortBy === "most_reviews") {
    next.sort((left, right) => right.reviews - left.reviews);
  } else {
    next.sort((left, right) => left.listingName.localeCompare(right.listingName));
  }
  return next;
}

export function ReviewAnalyticsPage() {
  const { slug = "" } = useParams();
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(() => monthRange());
  const [directory, setDirectory] = useState("");
  const [listing, setListing] = useState("");
  const [label, setLabel] = useState("");
  const [tab, setTab] = useState<"listings" | "labels">("listings");
  const [sortBy, setSortBy] = useState("highest_rating");

  const query = useMemo(
    () => ({
      ...filters,
      directory: directory ? (directory as "google" | "foodpanda") : undefined,
      listing: listing || undefined,
      label: label || undefined,
    }),
    [filters, directory, listing, label],
  );

  useEffect(() => {
    fetchReviewAnalytics(slug, query)
      .then(setAnalytics)
      .catch(() => setError("Could not load review analytics"));
  }, [slug, query]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!analytics) {
    return <div>Loading...</div>;
  }

  const breakdown =
    tab === "listings"
      ? sortRows(analytics.listingsBreakdown, sortBy)
      : sortRows(analytics.labelsBreakdown, sortBy);

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
        <h1>Review Analytics</h1>
        <button
          type="button"
          onClick={() =>
            fetchReviewAnalytics(slug, query)
              .then(setAnalytics)
              .catch(() => setError("Could not load review analytics"))
          }
        >
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
        <input
          type="search"
          placeholder="Search listings"
          value={listing}
          onChange={(event) => setListing(event.target.value)}
        />
        <input
          type="search"
          placeholder="Search labels"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <select
          value={directory}
          onChange={(event) => setDirectory(event.target.value)}
        >
          <option value="">All Directories</option>
          <option value="google">Google</option>
          <option value="foodpanda">Foodpanda</option>
        </select>
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
          title="Total Reviews"
          value={String(analytics.totalReviews)}
          trend={analytics.totalReviewsTrend}
        />
        <KpiCard
          title="Average Rating"
          value={analytics.averageRating.toFixed(2)}
          trend={analytics.averageRatingTrend}
        />
        <KpiCard
          title="Reply Rate"
          value={`${analytics.replyRate}%`}
          trend={analytics.replyRateTrend}
          subtitle={`Responded to ${analytics.repliedCount} reviews`}
        />
        <KpiCard
          title="Positive Reviews"
          value={`${analytics.positiveReviewsPercent}%`}
          trend={analytics.positiveReviewsTrend}
          subtitle={`${analytics.positiveReviewsCount} positive reviews`}
        />
      </div>

      <RatingsChart data={analytics.ratingsByDate} />

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
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setTab("listings")}
              style={{ fontWeight: tab === "listings" ? 700 : 400 }}
            >
              Listings
            </button>
            <button
              type="button"
              onClick={() => setTab("labels")}
              style={{ fontWeight: tab === "labels" ? 700 : 400 }}
            >
              Listing Labels
            </button>
          </div>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="highest_rating">Highest Rating</option>
            <option value="most_reviews">Most Reviews</option>
            <option value="name">Name</option>
          </select>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Listing</th>
              <th align="left">Reviews</th>
              <th align="left">Rating</th>
              <th align="left">Positive Reviews</th>
              <th align="left">Negative Reviews</th>
              <th align="left">Reply Rate</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "#9ca3af", paddingTop: 16 }}>
                  No listing data for this period
                </td>
              </tr>
            ) : (
              breakdown.map((row) => (
                <tr key={row.listingName}>
                  <td>{row.listingName}</td>
                  <td>{row.reviews}</td>
                  <td>{row.rating.toFixed(1)}</td>
                  <td>
                    {row.positivePercent}% ({row.positiveCount})
                  </td>
                  <td>
                    {row.negativePercent}% ({row.negativeCount})
                  </td>
                  <td>
                    {row.replyRate}% ({row.repliedCount})
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
