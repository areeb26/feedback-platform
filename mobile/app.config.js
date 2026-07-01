export default {
  expo: {
    name: "Feedback Platform",
    slug: "feedback-platform",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "feedback-platform",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    plugins: ["expo-router", "expo-secure-store"],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    },
  },
};
