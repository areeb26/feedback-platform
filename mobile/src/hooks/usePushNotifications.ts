import { useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { registerPushToken } from "../api/tenant";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getExpoPushToken() {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function usePushNotifications(enabled: boolean) {
  const router = useRouter();
  const { getToken, orgId } = useAuth();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !orgId) {
      return;
    }

    let active = true;

    void (async () => {
      const pushToken = await getExpoPushToken();
      if (!active || !pushToken || pushToken === registeredRef.current) {
        return;
      }

      await registerPushToken(() => getToken(), pushToken);
      registeredRef.current = pushToken;
    })();

    return () => {
      active = false;
    };
  }, [enabled, orgId, getToken]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          type?: string;
          incidentId?: string;
          reviewId?: string;
        };

        if (data.type === "incident" && data.incidentId) {
          router.push(`/incident/${data.incidentId}`);
          return;
        }

        if (data.type === "review" && data.reviewId) {
          router.push(`/review/${data.reviewId}`);
        }
      },
    );

    return () => subscription.remove();
  }, [router]);
}
