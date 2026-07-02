import { PushToken } from "../models/pushToken.js";
import { Location } from "../models/location.js";
import type { ExpoPushClient } from "./expoPush.js";

async function resolvePushTokens(
  tenantId: string,
  locationId?: string,
): Promise<string[]> {
  if (locationId) {
    const location = await Location.findOne({
      _id: locationId,
      tenantId,
    });
    if (location?.assigneeUserIds?.length) {
      const assigneeTokens = await PushToken.find({
        tenantId,
        userId: { $in: location.assigneeUserIds },
      });
      if (assigneeTokens.length > 0) {
        return assigneeTokens.map((entry) => entry.token);
      }
    }
  }

  const tokens = await PushToken.find({ tenantId });
  return tokens.map((entry) => entry.token);
}

export async function notifyTenantUsers(
  expoClient: ExpoPushClient,
  tenantId: string,
  notification: {
    title: string;
    body: string;
    data: Record<string, string>;
  },
  locationId?: string,
) {
  const tokenValues = await resolvePushTokens(tenantId, locationId);
  if (tokenValues.length === 0) {
    return;
  }

  await expoClient.send(
    tokenValues.map((token) => ({
      to: token,
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
  locationId?: string,
) {
  await notifyTenantUsers(
    expoClient,
    tenantId,
    {
      title: "New incident",
      body: `Incident ${code} requires attention`,
      data: { type: "incident", incidentId },
    },
    locationId,
  );
}

export async function notifyUnrepliedReview(
  expoClient: ExpoPushClient,
  tenantId: string,
  reviewId: string,
  reviewerName: string,
  locationId?: string,
) {
  await notifyTenantUsers(
    expoClient,
    tenantId,
    {
      title: "Review needs reply",
      body: `${reviewerName} left a review awaiting your reply`,
      data: { type: "review", reviewId },
    },
    locationId,
  );
}
