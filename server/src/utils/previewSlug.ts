import { randomBytes } from "node:crypto";

export function generatePreviewSlug() {
  return randomBytes(8).toString("hex");
}
