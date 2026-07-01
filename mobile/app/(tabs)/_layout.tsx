import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#7c3aed",
      }}
    >
      <Tabs.Screen name="overview" options={{ title: "Overview" }} />
      <Tabs.Screen name="incidents" options={{ title: "Incidents" }} />
      <Tabs.Screen name="reviews" options={{ title: "Reviews" }} />
    </Tabs>
  );
}
