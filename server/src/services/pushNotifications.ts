import { PushToken } from "../models/pushToken.js";
import type { ExpoPushClient } from "./expoPush.js";

export async function notifyTenantUsers(
  expoClient: ExpoPushClient,
  tenantId: string,
  notification: {
    title: string;
    body: string;
    data: Record<string, string>;
  },
) {
  const tokens = await PushToken.find({ tenantId });
  if (tokens.length === 0) {
    return;
  }

  await expoClient.send(
    tokens.map((entry) => ({
      to: entry.token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    })),
  );
}

export async function notifyNewIncident(
  expoClient: ExpoPushClient,
  tenantId: string,
  incidentId: string,
  code: string,
) {
  await notifyTenantUsers(expoClient, tenantId, {
    title: "New incident",
    body: `Incident ${code} requires attention`,
    data: { type: "incident", incidentId },
  });
}

export async function notifyUnrepliedReview(
  expoClient: ExpoPushClient,
  tenantId: string,
  reviewId: string,
  reviewerName: string,
) {
  await notifyTenantUsers(expoClient, tenantId, {
    title: "Review needs reply",
    body: `${reviewerName} left a review awaiting your reply`,
    data: { type: "review", reviewId },
  });
}
