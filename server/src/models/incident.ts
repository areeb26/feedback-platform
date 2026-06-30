import mongoose, { Schema, type InferSchemaType } from "mongoose";

const timelineEventSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["created", "reviewed", "resolved"],
      required: true,
    },
    at: { type: Date, required: true },
  },
  { _id: false },
);

const incidentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    submissionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Submission",
    },
    code: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["created", "reviewed", "resolved"],
      default: "created",
    },
    timeline: { type: [timelineEventSchema], required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    assignees: { type: [String], default: [] },
  },
  { timestamps: true },
);

incidentSchema.index({ tenantId: 1, createdAt: -1 });

export type IncidentDocument = InferSchemaType<typeof incidentSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Incident =
  mongoose.models.Incident ?? mongoose.model("Incident", incidentSchema);
