import mongoose, { Schema, type InferSchemaType } from "mongoose";

const localizedLabelSchema = new Schema(
  {
    en: { type: String, required: true },
    ur: { type: String, required: true },
  },
  { _id: false },
);

const issueCategoryOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: localizedLabelSchema, required: true },
  },
  { _id: false },
);

const surveyQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["rating", "text"], required: true },
    label: { type: localizedLabelSchema, required: true },
    required: { type: Boolean, default: true },
  },
  { _id: false },
);

const surveyFollowUpSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    triggerMaxRating: { type: Number, default: 3 },
    choicesByChannel: {
      in_store: { type: [issueCategoryOptionSchema], required: true },
      takeaway: { type: [issueCategoryOptionSchema], required: true },
      delivery: { type: [issueCategoryOptionSchema], required: true },
    },
  },
  { _id: false },
);

const surveySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    name: { type: String, required: true },
    previewSlug: { type: String, required: true, unique: true },
    questions: { type: [surveyQuestionSchema], required: true },
    followUp: { type: surveyFollowUpSchema, required: true },
  },
  { timestamps: true },
);

surveySchema.index({ tenantId: 1, createdAt: -1 });

export type SurveyDocument = InferSchemaType<typeof surveySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Survey =
  mongoose.models.Survey ?? mongoose.model("Survey", surveySchema);
