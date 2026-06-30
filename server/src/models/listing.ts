import mongoose, { Schema, type InferSchemaType } from "mongoose";

const listingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    directory: {
      type: String,
      enum: ["google", "foodpanda"],
      required: true,
    },
    externalId: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

listingSchema.index({ tenantId: 1, directory: 1, externalId: 1 }, { unique: true });
listingSchema.index({ tenantId: 1, locationId: 1 });

export type ListingDocument = InferSchemaType<typeof listingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Listing =
  mongoose.models.Listing ?? mongoose.model("Listing", listingSchema);
