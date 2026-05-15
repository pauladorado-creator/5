import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CookedProvider } from "@/src/lib/cooked";
import { SettingsProvider } from "@/src/lib/settings";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <CookedProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="recipe/[id]" />
            <Stack.Screen name="chat" options={{ presentation: "modal" }} />
            <Stack.Screen name="cart" options={{ presentation: "modal" }} />
          </Stack>
          </CookedProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
