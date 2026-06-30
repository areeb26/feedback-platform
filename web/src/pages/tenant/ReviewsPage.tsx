import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Review } from "@feedback-platform/shared";
import {
  exportReviewsUrl,
  fetchReviews,
  formatReviewDate,
  importReviewsCsv,
  replyToReview,
  reviewStatusLabel,
  sourceLabel,
} from "../../api/reviews";
import {
  fetchGoogleConnection,
  startGoogleConnect,
  syncGoogleReviews,
  type GoogleConnection,
} from "../../api/google";

function statusBadgeStyle(status: Review["status"]) {
  if (status === "replied") {
    return { background: "#dcfce7", color: "#166534" };
  }
  if (status === "reply_not_supported") {
    return { background: "#f3f4f6", color: "#4b5563" };
  }
  return { background: "#fef3c7", color: "#92400e" };
}

function sourceBadgeStyle(source: Review["source"]) {
  if (source === "google") {
    return { background: "#dbeafe", color: "#1d4ed8" };
  }
  return { background: "#fce7f3", color: "#be185d" };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#f59e0b" }}>
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export function ReviewsPage() {
  const { slug = "" } = useParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [directory, setDirectory] = useState("");
  const [rating, setRating] = useState("");
  const [listing, setListing] = useState("");
  const [content, setContent] = useState("");
  const [googleConnection, setGoogleConnection] =
    useState<GoogleConnection | null>(null);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);

  const filters = useMemo(() => {
    const query: Record<string, string> = {};
    if (directory) query.directory = directory;
    if (rating) query.rating = rating;
    if (listing) query.listing = listing;
    if (content) query.content = content;
    return query;
  }, [directory, rating, listing, content]);

  async function loadReviews() {
    setReviews(await fetchReviews(slug, filters));
  }

  useEffect(() => {
    Promise.all([
      loadReviews(),
      fetchGoogleConnection(slug)
        .then(setGoogleConnection)
        .catch(() => undefined),
    ]).catch(() => setError("Could not load reviews"));
  }, [slug, filters]);

  const unrepliedIds = reviews
    .filter((review) => review.status === "not_replied")
    .map((review) => review.id);

  function toggleSelected(reviewId: string) {
    setSelectedIds((current) =>
      current.includes(reviewId)
        ? current.filter((id) => id !== reviewId)
        : [...current, reviewId],
    );
  }

  function selectAllUnreplied() {
    setSelectedIds(unrepliedIds);
  }

  async function handleImport(file: File) {
    const csv = await file.text();
    await importReviewsCsv(slug, { source: "foodpanda", csv });
    await loadReviews();
  }

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return;
    try {
      await replyToReview(slug, reviewId, { replyText: replyText.trim() });
      setReplyingId(null);
      setReplyText("");
      await loadReviews();
    } catch {
      setGoogleMessage("Could not post reply. Check Google connection.");
    }
  }

  async function handleGoogleConnect() {
    try {
      const { authUrl, state } = await startGoogleConnect(slug);
      window.sessionStorage.setItem("google_oauth_state", state);
      window.sessionStorage.setItem("google_oauth_slug", slug);
      window.sessionStorage.setItem("google_oauth_return_to", `/t/${slug}/reviews`);
      window.location.href = authUrl;
    } catch {
      setGoogleMessage("Could not start Google connect flow.");
    }
  }

  async function handleGoogleSync() {
    try {
      const result = await syncGoogleReviews(slug);
      setGoogleMessage(
        `Synced ${result.imported} new and ${result.updated} updated reviews.`,
      );
      setGoogleConnection(await fetchGoogleConnection(slug));
      await loadReviews();
    } catch (syncError) {
      setGoogleMessage(
        syncError instanceof Error
          ? syncError.message
          : "Google sync failed",
      );
      setGoogleConnection(await fetchGoogleConnection(slug));
    }
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1>Reviews</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {googleConnection?.status === "connected" ? (
            <button type="button" onClick={handleGoogleSync}>
              Sync Google Reviews
            </button>
          ) : (
            <button type="button" onClick={handleGoogleConnect}>
              Connect Google Reviews
            </button>
          )}
          <label style={{ cursor: "pointer" }}>
            Import Foodpanda CSV
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleImport(file).catch(() =>
                    setError("Could not import reviews"),
                  );
                }
              }}
            />
          </label>
          <button type="button" onClick={() => loadReviews()}>
            Refresh
          </button>
          <a href={exportReviewsUrl(slug, filters)}>Export</a>
        </div>
      </div>

      {googleConnection?.errorMessage ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          Google connection issue: {googleConnection.errorMessage}
        </div>
      ) : null}
      {googleMessage ? (
        <div style={{ marginBottom: 16, color: "#4b5563" }}>{googleMessage}</div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <span>{selectedIds.length} selected</span>
        <button type="button" onClick={selectAllUnreplied}>
          Select all unreplied
        </button>
        <select
          value={directory}
          onChange={(event) => setDirectory(event.target.value)}
        >
          <option value="">Directory</option>
          <option value="google">Google</option>
          <option value="foodpanda">Foodpanda</option>
        </select>
        <select
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          <option value="">Rating</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={String(value)}>
              {value} stars
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Listing"
          value={listing}
          onChange={(event) => setListing(event.target.value)}
        />
        <input
          type="search"
          placeholder="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>

      {reviews.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: "1px dashed #d1d5db",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          No reviews yet. Import a Foodpanda CSV or connect Google Reviews.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {reviews.map((review) => (
            <article
              key={review.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(review.id)}
                    onChange={() => toggleSelected(review.id)}
                  />
                  <span
                    style={{
                      ...sourceBadgeStyle(review.source),
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    {sourceLabel(review.source)}
                  </span>
                </div>
                <span
                  style={{
                    ...statusBadgeStyle(review.status),
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {reviewStatusLabel(review.status)}
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 600 }}>{review.reviewerName}</div>
                <div style={{ marginTop: 4 }}>
                  <Stars rating={review.rating} />
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {formatReviewDate(review.postedAt)}
                </div>
              </div>

              <p style={{ margin: 0, lineHeight: 1.5 }}>{review.content}</p>

              {review.locationName ? (
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {review.locationName}
                </div>
              ) : null}

              {review.canReply ? (
                replyingId === review.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      rows={3}
                      placeholder="Write your reply"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleReply(review.id)}
                      >
                        Submit reply
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyText("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingId(review.id);
                      setReplyText("");
                    }}
                  >
                    Reply
                  </button>
                )
              ) : review.status === "reply_not_supported" ? (
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  Reply Not Supported
                </span>
              ) : review.replyText ? (
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  Reply: {review.replyText}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
