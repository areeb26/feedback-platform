import mongoose, { Schema, type InferSchemaType } from "mongoose";

const competitorSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    name: { type: String, required: true },
    placeId: { type: String, required: true },
    rating: { type: Number },
    reviewCount: { type: Number, default: 0 },
    lastRefreshedAt: { type: Date },
  },
  { timestamps: true },
);

competitorSchema.index({ tenantId: 1, placeId: 1 }, { unique: true });

export type CompetitorDocument = InferSchemaType<typeof competitorSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Competitor =
  mongoose.models.Competitor ??
  mongoose.model("Competitor", competitorSchema);
