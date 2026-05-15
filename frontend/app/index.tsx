import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, COLORS, FRIDGE_URL, LOGO_URL, MAGNETS, User, getStoredUser, setStoredUser } from "@/src/lib/api";
import { DraggableMagnet } from "@/src/components/DraggableMagnet";

const { width, height } = Dimensions.get("window");

// Initial position grid (rough top-right area of fridge). User can drag freely.
function defaultPosition(idx: number) {
  const cols = 3;
  const startX = width * 0.08;
  const startY = height * 0.18;
  const stepX = width * 0.28;
  const stepY = 110;
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  return { x: startX + col * stepX, y: startY + row * stepY };
}

export default function Splash() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasUser, setHasUser] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const stored = await getStoredUser();
    if (stored) {
      // Pull latest magnets from backend so newly earned ones show up.
      try {
        const fresh = await api.getUser(stored.id);
        await setStoredUser(fresh);
        setUser(fresh);
        setHasUser(true);
      } catch {
        setUser(stored);
        setHasUser(true);
      }
    } else {
      setUser(null);
      setHasUser(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const enterApp = () => router.replace("/(app)/parati");

  return (
    <View style={styles.root}>
      {/* Full-bleed fridge background */}
      <Image source={{ uri: FRIDGE_URL }} style={styles.fridge} resizeMode="cover" />

      {/* Collected magnets (draggable) */}
      {hasUser && user?.magnets?.map((ccaa, idx) => {
        const uri = MAGNETS[ccaa];
        if (!uri) return null;
        return (
          <DraggableMagnet
            key={`${user.id}-${ccaa}`}
            uri={uri}
            storageKey={`magnet_pos_${user.id}_${ccaa}`}
            initial={defaultPosition(idx)}
            size={100}
          />
        );
      })}

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]} pointerEvents="box-none">
        {/* Small logo, no background, over the fridge */}
        <View style={styles.logoWrap} pointerEvents="none">
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={{ flex: 1 }} pointerEvents="box-none" />

        {hasUser ? (
          <View style={styles.bottomArea}>
            <TouchableOpacity testID="enter-app-btn" style={styles.enterBtn} onPress={enterApp} activeOpacity={0.85}>
              <Text style={styles.enterText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        ) : hasUser === false ? (
          <View style={styles.bottomArea}>
            <View style={styles.buttonsRow}>
              <TouchableOpacity testID="login-btn" style={[styles.btn, styles.btnLight]} onPress={() => router.push("/login")} activeOpacity={0.85}>
                <Text style={styles.btnText}>Iniciar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="register-btn" style={[styles.btn, styles.btnDark]} onPress={() => router.push("/register")} activeOpacity={0.85}>
                <Text style={[styles.btnText, { color: COLORS.white }]}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  fridge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  safe: { flex: 1, justifyContent: "space-between" },
  logoWrap: { alignItems: "center", paddingTop: 6 },
  logo: { width: 110, height: 36 },
  bottomArea: { paddingHorizontal: 20, paddingBottom: 18, gap: 12 },
  buttonsRow: { flexDirection: "row", gap: 12 },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnLight: { backgroundColor: "rgba(255,255,255,0.95)" },
  btnDark: { backgroundColor: COLORS.text },
  btnText: { fontSize: 15, fontWeight: "700", color: COLORS.text, letterSpacing: 0.3 },
  enterBtn: {
    alignSelf: "center",
    backgroundColor: COLORS.text,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
  },
  enterText: { color: COLORS.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
});
