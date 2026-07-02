import { Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useAuth, useClerk, useOrganization, useOrganizationList } from "@clerk/clerk-expo";

function AccountMenu() {
  const { orgId } = useAuth();
  const { organization } = useOrganization();
  const { signOut } = useClerk();
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const memberships = userMemberships.data ?? [];

  return (
    <View style={styles.menu}>
      <Text style={styles.orgName}>{organization?.name ?? "Workspace"}</Text>
      {memberships.length > 1 ? (
        <View style={styles.switcher}>
          {memberships.map((membership) => (
            <Pressable
              key={membership.organization.id}
              style={[
                styles.switchButton,
                membership.organization.id === orgId &&
                  styles.switchButtonActive,
              ]}
              onPress={() =>
                void setActive({ organization: membership.organization.id })
              }
            >
              <Text style={styles.switchButtonText}>
                {membership.organization.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable style={styles.signOut} onPress={() => void signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#7c3aed",
        headerRight: () => <AccountMenu />,
      }}
    >
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="incidents" options={{ title: "Incidents" }} />
      <Tabs.Screen name="reviews" options={{ title: "Reviews" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  menu: {
    alignItems: "flex-end",
    paddingRight: 12,
    maxWidth: 180,
  },
  orgName: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  switcher: {
    gap: 4,
    marginBottom: 4,
  },
  switchButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  switchButtonActive: {
    backgroundColor: "#ede9fe",
  },
  switchButtonText: {
    fontSize: 11,
    color: "#111827",
  },
  signOut: {
    paddingVertical: 4,
  },
  signOutText: {
    fontSize: 12,
    color: "#7c3aed",
    fontWeight: "600",
  },
});
