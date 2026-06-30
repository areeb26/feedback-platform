import mongoose, { Schema, type InferSchemaType } from "mongoose";

const autoReplyRuleSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    name: { type: String },
    maxRating: { type: Number, required: true, min: 1, max: 5 },
    templateText: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

autoReplyRuleSchema.index({ tenantId: 1, maxRating: 1 });

export type AutoReplyRuleDocument = InferSchemaType<typeof autoReplyRuleSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AutoReplyRule =
  mongoose.models.AutoReplyRule ??
  mongoose.model("AutoReplyRule", autoReplyRuleSchema);
