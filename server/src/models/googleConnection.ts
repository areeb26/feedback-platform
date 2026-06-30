import mongoose, { Schema, type InferSchemaType } from "mongoose";

const googleConnectionSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
      unique: true,
    },
    accountId: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["connected", "expired", "error"],
      default: "connected",
    },
    errorMessage: { type: String },
    reviewCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type GoogleConnectionDocument = InferSchemaType<
  typeof googleConnectionSchema
> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const GoogleConnection =
  mongoose.models.GoogleConnection ??
  mongoose.model("GoogleConnection", googleConnectionSchema);
