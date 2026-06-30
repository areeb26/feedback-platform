import mongoose, { Schema, type InferSchemaType } from "mongoose";

const surveyQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["rating", "text"], required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: true },
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
