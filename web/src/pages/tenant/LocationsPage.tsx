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
          <li key={location.id}>
            {location.name}
            <button type="button" onClick={() => handleRename(location)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
