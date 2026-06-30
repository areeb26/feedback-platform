import mongoose, { Schema, type InferSchemaType } from "mongoose";

const locationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    name: { type: String, required: true },
    address: { type: String },
    labels: { type: [String], default: [] },
  },
  { timestamps: true },
);

locationSchema.index({ tenantId: 1, name: 1 });

export type LocationDocument = InferSchemaType<typeof locationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Location =
  mongoose.models.Location ?? mongoose.model("Location", locationSchema);
