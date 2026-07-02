import { bilingualLabel, type Channel, type SurveyLocale } from "@feedback-platform/shared";

export const defaultRatingQuestion = {
  id: "q1",
  type: "rating" as const,
  label: bilingualLabel("Overall experience", "مجموعی تجربہ"),
  required: true,
};

export function submitMeta(
  channel: Channel = "in_store",
  locale: SurveyLocale = "en",
) {
  return { channel, locale };
}
