import mongoose, { Schema, type InferSchemaType } from "mongoose";

const customerSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    mostRecentLocationId: { type: Schema.Types.ObjectId, ref: "Location" },
  },
  { timestamps: true },
);

customerSchema.index({ tenantId: 1, phone: 1 });
customerSchema.index({ tenantId: 1, email: 1 });

export type CustomerDocument = InferSchemaType<typeof customerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Customer =
  mongoose.models.Customer ?? mongoose.model("Customer", customerSchema);
