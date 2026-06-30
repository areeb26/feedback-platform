import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchGoogleConnection } from "../../api/google";
import {
  directoryLabel,
  fetchListings,
  syncListings,
  type Listing,
} from "../../api/listings";

export function ListingsPage() {
  const { slug = "" } = useParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadListings() {
    setListings(await fetchListings(slug));
  }

  useEffect(() => {
    Promise.all([
      loadListings(),
      fetchGoogleConnection(slug)
        .then((connection) => setGoogleConnected(connection.status === "connected"))
        .catch(() => setGoogleConnected(false)),
    ]).catch(() => setError("Could not load listings"));
  }, [slug]);

  async function handleSync() {
    try {
      const result = await syncListings(slug);
      setMessage(`Synced ${result.synced} listings from Google.`);
      await loadListings();
    } catch (syncError) {
      setMessage(
        syncError instanceof Error ? syncError.message : "Sync failed",
      );
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
        }}
      >
        <h1>Listings</h1>
        {googleConnected ? (
          <button type="button" onClick={handleSync}>
            Sync from Google
          </button>
        ) : null}
      </div>

      {message ? <div style={{ marginBottom: 16 }}>{message}</div> : null}

      {!googleConnected && listings.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          <p style={{ fontWeight: 600, color: "#111827" }}>
            You are not yet connected to Google My Business, or existing
            connections do not have any active listings.
          </p>
          <p style={{ fontSize: 14, marginTop: 12 }}>
            Connect Google Reviews from the Reviews page, then sync listings
            here.
          </p>
        </div>
      ) : listings.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: "1px dashed #d1d5db",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          No listings yet. Click Sync from Google to import your locations.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Listing</th>
              <th align="left">Directory</th>
              <th align="left">Location</th>
              <th align="left">Rating</th>
              <th align="left">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td>{listing.name}</td>
                <td>{directoryLabel(listing.directory)}</td>
                <td>{listing.locationName ?? ""}</td>
                <td>{listing.rating.toFixed(1)}</td>
                <td>{listing.reviewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
