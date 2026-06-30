import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPublicSurvey,
  submitPublicSurvey,
  type PublicSurvey,
} from "../../api/surveys";

export function SurveyPreviewPage() {
  const { previewSlug = "" } = useParams();
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState("5");

  useEffect(() => {
    fetchPublicSurvey(previewSlug)
      .then(setSurvey)
      .catch(() => setError("Survey not found"));
  }, [previewSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!survey) {
      return;
    }

    const ratingQuestion = survey.questions.find(
      (question) => question.type === "rating",
    );
    if (!ratingQuestion) {
      return;
    }

    await submitPublicSurvey(previewSlug, {
      name: name || undefined,
      phone: phone || undefined,
      answers: [{ questionId: ratingQuestion.id, value: Number(rating) }],
    });
    setSubmitted(true);
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!survey) {
    return <div>Loading...</div>;
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
        <h1>Thank you!</h1>
        <p>Your feedback has been submitted.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
      <div style={{ color: survey.primaryColor, fontWeight: 700, marginBottom: 8 }}>
        {survey.tenantName}
      </div>
      <h1>{survey.name}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12 }}
          />
        </label>
        <label>
          Phone
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12 }}
          />
        </label>
        {survey.questions
          .filter((question) => question.type === "rating")
          .map((question) => (
            <label key={question.id}>
              {question.label}
              <select
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                style={{ display: "block", width: "100%", marginBottom: 12 }}
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </label>
          ))}
        <button type="submit">Submit feedback</button>
      </form>
    </div>
  );
}
