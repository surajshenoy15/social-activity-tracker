import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Tabs (Home, Explore, etc.) */}
      <Stack.Screen name="(tabs)" />

      {/* Student Login */}
      <Stack.Screen name="student-login" />

      {/* Student Dashboard Group */}
      <Stack.Screen name="(student)" />
    </Stack>
  );
}
