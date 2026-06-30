import mongoose, { Schema, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    source: {
      type: String,
      enum: ["google", "foodpanda"],
      required: true,
    },
    externalId: { type: String },
    reviewerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location" },
    locationName: { type: String },
    listingName: { type: String },
    categories: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["not_replied", "replied", "reply_not_supported"],
      required: true,
    },
    replyText: { type: String },
    repliedAt: { type: Date },
    postedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

reviewSchema.index({ tenantId: 1, postedAt: -1 });
reviewSchema.index({ tenantId: 1, externalId: 1 }, { sparse: true });

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Review =
  mongoose.models.Review ?? mongoose.model("Review", reviewSchema);
