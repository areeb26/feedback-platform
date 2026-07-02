import mongoose, { Schema, type InferSchemaType } from "mongoose";

const submissionAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const submissionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    surveyId: { type: Schema.Types.ObjectId, required: true, ref: "Survey" },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    rating: { type: Number },
    channel: {
      type: String,
      enum: ["in_store", "takeaway", "delivery"],
      required: true,
    },
    locale: { type: String, enum: ["en", "ur"], required: true },
    issueCategory: { type: String },
    answers: { type: [submissionAnswerSchema], required: true },
  },
  { timestamps: true },
);

submissionSchema.index({ tenantId: 1, surveyId: 1 });

export type SubmissionDocument = InferSchemaType<typeof submissionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Submission =
  mongoose.models.Submission ?? mongoose.model("Submission", submissionSchema);
