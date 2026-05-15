import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="chat" options={{ presentation: "modal" }} />
        <Stack.Screen name="cart" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
