import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  exportIncidentsUrl,
  fetchIncidents,
  formatIncidentDate,
  timelineLabel,
  updateIncident,
  type Incident,
} from "../../api/incidents";
import { fetchSurveys, type Survey } from "../../api/surveys";

export function IncidentsPage() {
  const { slug = "" } = useParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadIncidents() {
    setIncidents(await fetchIncidents(slug));
  }

  useEffect(() => {
    Promise.all([loadIncidents(), fetchSurveys(slug).then(setSurveys)]).catch(
      () => setError("Could not load incidents"),
    );
  }, [slug]);

  async function handleStatusChange(
    incident: Incident,
    status: "reviewed" | "resolved",
  ) {
    await updateIncident(slug, incident.id, { status });
    await loadIncidents();
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
        <h1>Incidents</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={exportIncidentsUrl(slug)}>Export CSV</a>
          {surveys[0] ? (
          <button
            type="button"
            onClick={() =>
              window.alert("Use public survey or API to create submissions")
            }
          >
            Create Submission
          </button>
        ) : null}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Code</th>
            <th align="left">Timeline</th>
            <th align="left">Created At</th>
            <th align="left">Rating</th>
            <th align="left">Survey</th>
            <th align="left">Location</th>
            <th align="left">Channel</th>
            <th align="left">Issue</th>
            <th align="left">Email</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td>{incident.code}</td>
              <td>
                {incident.timeline
                  .map((event) => timelineLabel(event.status))
                  .join(" → ")}
              </td>
              <td>{formatIncidentDate(incident.createdAt)}</td>
              <td>{incident.rating ?? ""}</td>
              <td>{incident.surveyName}</td>
              <td>{incident.locationName ?? ""}</td>
              <td>{incident.channel ?? ""}</td>
              <td>{incident.issueCategory ?? ""}</td>
              <td>{incident.customerEmail ?? ""}</td>
              <td style={{ display: "flex", gap: 8 }}>
                {incident.status === "created" ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(incident, "reviewed")}
                  >
                    Mark reviewed
                  </button>
                ) : null}
                {incident.status !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(incident, "resolved")}
                  >
                    Mark resolved
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 16 }}>
        Showing 1 - {incidents.length} of {incidents.length} record(s).
      </p>
    </div>
  );
}
