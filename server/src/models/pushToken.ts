import mongoose, { Schema, type InferSchemaType } from "mongoose";

const pushTokenSchema = new Schema(
  {
    userId: { type: String, required: true },
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    token: { type: String, required: true },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

pushTokenSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
pushTokenSchema.index({ tenantId: 1 });

export type PushTokenDocument = InferSchemaType<typeof pushTokenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PushToken =
  mongoose.models.PushToken ?? mongoose.model("PushToken", pushTokenSchema);
