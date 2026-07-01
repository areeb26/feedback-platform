import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { ClerkLoaded, ClerkProvider, useAuth, useOrganizationList } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { TenantProvider, useTenant } from "../src/context/TenantContext";
import { usePushNotifications } from "../src/hooks/usePushNotifications";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  Constants.expoConfig?.extra?.clerkPublishableKey ??
  "";

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

function OrganizationPicker() {
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const memberships = userMemberships.data ?? [];

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Choose organization</Text>
      <Text style={styles.subtitle}>Select the tenant workspace to open.</Text>
      {memberships.map((membership) => (
        <Pressable
          key={membership.organization.id}
          style={styles.orgButton}
          onPress={() => void setActive({ organization: membership.organization.id })}
        >
          <Text style={styles.orgButtonText}>{membership.organization.name}</Text>
        </Pressable>
      ))}
      {memberships.length === 0 ? (
        <Text style={styles.subtitle}>No organizations found for this account.</Text>
      ) : null}
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { loading: tenantLoading } = useTenant();

  usePushNotifications(Boolean(isSignedIn && orgId));

  useEffect(() => {
    if (!isLoaded || tenantLoading) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)/overview");
    }
  }, [isLoaded, isSignedIn, orgId, segments, router, tenantLoading]);

  if (!isLoaded || (isSignedIn && tenantLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (isSignedIn && !orgId) {
    return <OrganizationPicker />;
  }

  return <>{children}</>;
}

function RootNavigation() {
  return (
    <TenantProvider>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="incident/[id]"
            options={{ headerShown: true, title: "Incident" }}
          />
          <Stack.Screen
            name="review/[id]"
            options={{ headerShown: true, title: "Review" }}
          />
        </Stack>
      </AuthGate>
    </TenantProvider>
  );
}

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Missing Clerk key</Text>
        <Text style={styles.subtitle}>
          Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your environment.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <StatusBar style="dark" />
        <RootNavigation />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  orgButton: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  orgButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
