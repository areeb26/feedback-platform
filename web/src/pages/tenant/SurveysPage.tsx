import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { bilingualLabel } from "@feedback-platform/shared";
import {
  buildSurveyLink,
  createSurvey,
  deleteSurvey,
  fetchSurveys,
  formatSurveyDate,
  type Survey,
} from "../../api/surveys";
import { fetchLocations, type Location } from "../../api/tenant";

const defaultQuestions = [
  {
    id: "q1",
    type: "rating" as const,
    label: bilingualLabel("Overall experience", "مجموعی تجربہ"),
    required: true,
  },
];

export function SurveysPage() {
  const { slug = "" } = useParams();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function loadSurveys() {
    const [surveyRows, locationRows] = await Promise.all([
      fetchSurveys(slug),
      fetchLocations(slug),
    ]);
    setSurveys(surveyRows);
    setLocations(locationRows);
  }

  useEffect(() => {
    loadSurveys().catch(() => setError("Could not load surveys"));
  }, [slug]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createSurvey(slug, { name, questions: defaultQuestions });
    setName("");
    await loadSurveys();
  }

  async function handleDelete(survey: Survey) {
    if (!window.confirm(`Delete ${survey.name}?`)) {
      return;
    }
    await deleteSurvey(slug, survey.id);
    await loadSurveys();
  }

  function copyLink(survey: Survey, channel: "in_store" | "delivery") {
    const locationId = survey.locationId ?? locations[0]?.id;
    const path = buildSurveyLink(survey.previewSlug, { channel, locationId });
    const url = `${window.location.origin}${path}`;
    void navigator.clipboard.writeText(url);
    window.alert("Survey link copied");
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
        <h1>Surveys</h1>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Survey name"
            required
          />
          <button type="submit">+ New Survey</button>
        </form>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Preview Link</th>
            <th align="left">QR Links</th>
            <th align="left">Submissions</th>
            <th align="left">Created At</th>
            <th align="left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey) => (
            <tr key={survey.id}>
              <td>{survey.name}</td>
              <td>
                <Link to={survey.previewPath} target="_blank">
                  Preview Link
                </Link>
              </td>
              <td>
                <button type="button" onClick={() => copyLink(survey, "in_store")}>
                  In-store
                </button>{" "}
                <button type="button" onClick={() => copyLink(survey, "delivery")}>
                  Delivery
                </button>
              </td>
              <td>{survey.submissionCount}</td>
              <td>{formatSurveyDate(survey.createdAt)}</td>
              <td>
                <button type="button" onClick={() => handleDelete(survey)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 16 }}>
        Surveys support bilingual public forms with channel-aware follow-up for low
        ratings.
      </p>
    </div>
  );
}
