import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicSurvey, type PublicSurvey } from "../../api/surveys";

export function SurveyPreviewPage() {
  const { previewSlug = "" } = useParams();
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicSurvey(previewSlug)
      .then(setSurvey)
      .catch(() => setError("Survey not found"));
  }, [previewSlug]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!survey) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
      <div style={{ color: survey.primaryColor, fontWeight: 700, marginBottom: 8 }}>
        {survey.tenantName}
      </div>
      <h1>{survey.name}</h1>
      <p>Preview — submission opens in a later release.</p>
      <ul>
        {survey.questions.map((question) => (
          <li key={question.id}>
            {question.label} ({question.type})
          </li>
        ))}
      </ul>
    </div>
  );
}
