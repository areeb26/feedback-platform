import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  labelForLocale,
  type Channel,
  type IssueCategoryOption,
  type SurveyLocale,
} from "@feedback-platform/shared";
import {
  fetchPublicSurvey,
  submitPublicSurvey,
  type PublicSurvey,
  type SubmitSurveyResponse,
} from "../../api/surveys";

const channelLabels: Record<Channel, Record<SurveyLocale, string>> = {
  in_store: { en: "In-store", ur: "دکان پر" },
  takeaway: { en: "Takeaway", ur: "ٹیک اوے" },
  delivery: { en: "Delivery", ur: "ڈیلیوری" },
};

export function SurveyPreviewPage() {
  const { previewSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const channelParam = searchParams.get("channel");
  const locationParam = searchParams.get("location");
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<SurveyLocale>("en");
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitSurveyResponse | null>(
    null,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState("5");
  const [issueCategory, setIssueCategory] = useState("");

  const channel = useMemo<Channel>(() => {
    if (
      channelParam === "in_store" ||
      channelParam === "takeaway" ||
      channelParam === "delivery"
    ) {
      return channelParam;
    }
    return "in_store";
  }, [channelParam]);

  const locationId = locationParam ?? survey?.locationId ?? undefined;

  useEffect(() => {
    const query = new URLSearchParams();
    if (channelParam) query.set("channel", channelParam);
    if (locationParam) query.set("location", locationParam);
    const suffix = query.toString() ? `?${query.toString()}` : "";

    fetchPublicSurvey(previewSlug, suffix)
      .then(setSurvey)
      .catch(() => setError("Survey not found"));
  }, [previewSlug, channelParam, locationParam]);

  const followUpChoices: IssueCategoryOption[] = useMemo(() => {
    if (!survey) return [];
    return survey.followUp.choicesByChannel[channel] ?? [];
  }, [survey, channel]);

  const showFollowUp =
    survey?.followUp.enabled &&
    Number(rating) <= (survey?.followUp.triggerMaxRating ?? 3);

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

    const result = await submitPublicSurvey(previewSlug, {
      name: name || undefined,
      phone: phone || undefined,
      channel,
      locale,
      locationId,
      issueCategory: showFollowUp ? issueCategory : undefined,
      answers: [{ questionId: ratingQuestion.id, value: Number(rating) }],
    });
    setSubmitResult(result);
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
        <h1>{locale === "ur" ? "شکریہ!" : "Thank you!"}</h1>
        <p>
          {locale === "ur"
            ? "آپ کی رائے موصول ہو گئی۔"
            : "Your feedback has been submitted."}
        </p>
        {submitResult?.reviewNudge ? (
          <p style={{ marginTop: 16 }}>
            <a
              href={submitResult.reviewNudge.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
            >
              {locale === "ur"
                ? "گوگل پر جائزہ دیں"
                : "Leave us a Google review"}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "48px auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setLocale("en")}
          aria-pressed={locale === "en"}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLocale("ur")}
          aria-pressed={locale === "ur"}
        >
          اردو
        </button>
      </div>
      <div style={{ color: survey.primaryColor, fontWeight: 700, marginBottom: 8 }}>
        {survey.tenantName}
      </div>
      <p style={{ marginTop: 0, color: "#555" }}>
        {channelLabels[channel][locale]}
        {survey.locationName ? ` · ${survey.locationName}` : ""}
      </p>
      <h1>{survey.name}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {locale === "ur" ? "نام" : "Name"}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 12 }}
          />
        </label>
        <label>
          {locale === "ur" ? "فون" : "Phone"}
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
              {labelForLocale(question.label, locale)}
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
        {showFollowUp ? (
          <label>
            {locale === "ur" ? "مسئلہ کیا تھا؟" : "What went wrong?"}
            <select
              value={issueCategory}
              onChange={(event) => setIssueCategory(event.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: 12 }}
            >
              <option value="">
                {locale === "ur" ? "منتخب کریں" : "Select one"}
              </option>
              {followUpChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {labelForLocale(choice.label, locale)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit">
          {locale === "ur" ? "رائے بھیجیں" : "Submit feedback"}
        </button>
      </form>
    </div>
  );
}
