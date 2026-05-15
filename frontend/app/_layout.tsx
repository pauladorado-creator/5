import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CookedProvider } from "@/src/lib/cooked";
import { SavedProvider } from "@/src/lib/saved";
import { SettingsProvider } from "@/src/lib/settings";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SavedProvider>
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
            <Stack.Screen name="saved" options={{ presentation: "modal" }} />
          </Stack>
          </CookedProvider>
          </SavedProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
