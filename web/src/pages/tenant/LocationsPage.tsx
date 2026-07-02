import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  createLocation,
  fetchLocations,
  updateLocation,
  type Location,
} from "../../api/tenant";

export function LocationsPage() {
  const { slug = "" } = useParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function loadLocations() {
    const data = await fetchLocations(slug);
    setLocations(data);
  }

  useEffect(() => {
    loadLocations().catch(() => setError("Could not load locations"));
  }, [slug]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createLocation(slug, { name });
    setName("");
    await loadLocations();
  }

  async function handleRename(location: Location) {
    const nextName = window.prompt("Location name", location.name);
    if (!nextName || nextName === location.name) {
      return;
    }
    await updateLocation(slug, location.id, { name: nextName });
    await loadLocations();
  }

  async function handleAssignees(location: Location) {
    const next = window.prompt(
      "Assignee Clerk user IDs (comma-separated)",
      location.assigneeUserIds.join(", "),
    );
    if (next === null) {
      return;
    }
    const assigneeUserIds = next
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    await updateLocation(slug, location.id, { assigneeUserIds });
    await loadLocations();
  }

  async function handleGooglePlaceId(location: Location) {
    const next = window.prompt(
      "Google Place ID for review nudge links",
      location.googlePlaceId ?? "",
    );
    if (next === null) {
      return;
    }
    await updateLocation(slug, location.id, {
      googlePlaceId: next.trim() || null,
    });
    await loadLocations();
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h1>Locations</h1>
      <form onSubmit={handleCreate} style={{ marginBottom: 24 }}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New location name"
          required
        />
        <button type="submit">Add location</button>
      </form>
      <ul>
        {locations.map((location) => (
          <li key={location.id} style={{ marginBottom: 12 }}>
            <strong>{location.name}</strong>
            <div style={{ fontSize: 14, color: "#555" }}>
              Assignees: {location.assigneeUserIds.join(", ") || "None"}
            </div>
            <div style={{ fontSize: 14, color: "#555" }}>
              Google Place ID: {location.googlePlaceId ?? "Not set"}
            </div>
            <button type="button" onClick={() => handleRename(location)}>
              Edit name
            </button>{" "}
            <button type="button" onClick={() => handleAssignees(location)}>
              Assignees
            </button>{" "}
            <button type="button" onClick={() => handleGooglePlaceId(location)}>
              Google Place ID
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
