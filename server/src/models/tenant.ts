import mongoose, { Schema, type InferSchemaType } from "mongoose";

const tenantSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    logoUrl: { type: String },
    primaryColor: { type: String, required: true, default: "#7c3aed" },
    clerkOrgId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    featureFlags: {
      socialListening: { type: Boolean, default: false },
      competitorAnalytics: { type: Boolean, default: false },
      aiReplies: { type: Boolean, default: false },
      googleReviews: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export type TenantDocument = InferSchemaType<typeof tenantSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Tenant =
  mongoose.models.Tenant ?? mongoose.model("Tenant", tenantSchema);
