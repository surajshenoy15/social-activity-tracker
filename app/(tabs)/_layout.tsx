import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // hidden by default
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="explore" />
    </Tabs>
  );
}