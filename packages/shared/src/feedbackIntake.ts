import { z } from "zod";

export const surveyLocaleSchema = z.enum(["en", "ur"]);
export type SurveyLocale = z.infer<typeof surveyLocaleSchema>;

export const channelSchema = z.enum(["in_store", "takeaway", "delivery"]);
export type Channel = z.infer<typeof channelSchema>;

export const localizedLabelSchema = z.object({
  en: z.string().min(1),
  ur: z.string().min(1),
});

export type LocalizedLabel = z.infer<typeof localizedLabelSchema>;

export const issueCategoryOptionSchema = z.object({
  id: z.string().min(1),
  label: localizedLabelSchema,
});

export type IssueCategoryOption = z.infer<typeof issueCategoryOptionSchema>;

export const surveyFollowUpSchema = z.object({
  enabled: z.boolean().default(true),
  triggerMaxRating: z.number().int().min(1).max(5).default(3),
  choicesByChannel: z.object({
    in_store: z.array(issueCategoryOptionSchema),
    takeaway: z.array(issueCategoryOptionSchema),
    delivery: z.array(issueCategoryOptionSchema),
  }),
});

export type SurveyFollowUp = z.infer<typeof surveyFollowUpSchema>;

export const DEFAULT_ISSUE_CATEGORIES: SurveyFollowUp["choicesByChannel"] = {
  in_store: [
    {
      id: "food_quality",
      label: { en: "Food quality", ur: "کھانے کا معیار" },
    },
    { id: "service", label: { en: "Service", ur: "سروس" } },
    { id: "wait_time", label: { en: "Wait time", ur: "انتظار کا وقت" } },
    {
      id: "cleanliness",
      label: { en: "Cleanliness", ur: "صفائی" },
    },
    { id: "other", label: { en: "Other", ur: "دیگر" } },
  ],
  takeaway: [
    {
      id: "food_quality",
      label: { en: "Food quality", ur: "کھانے کا معیار" },
    },
    { id: "packaging", label: { en: "Packaging", ur: "پیکجنگ" } },
    { id: "wait_time", label: { en: "Wait time", ur: "انتظار کا وقت" } },
    {
      id: "order_accuracy",
      label: { en: "Order accuracy", ur: "آرڈر کی درستگی" },
    },
    { id: "other", label: { en: "Other", ur: "دیگر" } },
  ],
  delivery: [
    { id: "packaging", label: { en: "Packaging", ur: "پیکجنگ" } },
    {
      id: "temperature",
      label: { en: "Temperature", ur: "درجہ حرارت" },
    },
    {
      id: "wrong_item",
      label: { en: "Wrong item", ur: "غلط آئٹم" },
    },
    {
      id: "delivery_time",
      label: { en: "Delivery time", ur: "ڈیلیوری کا وقت" },
    },
    { id: "driver", label: { en: "Driver", ur: "ڈرائیور" } },
    { id: "other", label: { en: "Other", ur: "دیگر" } },
  ],
};

export function defaultSurveyFollowUp(): SurveyFollowUp {
  return {
    enabled: true,
    triggerMaxRating: 3,
    choicesByChannel: DEFAULT_ISSUE_CATEGORIES,
  };
}

export function bilingualLabel(en: string, ur: string): LocalizedLabel {
  return { en, ur };
}

export const INCIDENT_RATING_THRESHOLD = 3;
export const REVIEW_NUDGE_MIN_RATING = 4;

export function buildGoogleReviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function labelForLocale(
  label: LocalizedLabel,
  locale: SurveyLocale,
): string {
  return label[locale];
}

const CHANNEL_LABELS_EN: Record<Channel, string> = {
  in_store: "In-store",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export function channelLabelEn(channel: Channel): string {
  return CHANNEL_LABELS_EN[channel];
}

export function issueCategoryLabelEn(categoryId: string): string {
  for (const options of Object.values(DEFAULT_ISSUE_CATEGORIES)) {
    const match = options.find((option) => option.id === categoryId);
    if (match) {
      return match.label.en;
    }
  }
  return categoryId.replaceAll("_", " ");
}
