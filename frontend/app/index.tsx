import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions, PanResponder } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, FRIDGE_URL, LOGO_URL, MAGNETS, getStoredUser } from "@/src/lib/api";

const { height } = Dimensions.get("window");

export default function Splash() {
  const router = useRouter();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => { getStoredUser().then(u => setHasUser(!!u)); }, []);

  const enterApp = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -height, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => router.replace("/(app)/parati"));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => { if (g.dy < 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -80 && hasUser) enterApp();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={[styles.root, { opacity, transform: [{ translateY }] }]} {...panResponder.panHandlers}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.magnetsRow}>
          {Object.entries(MAGNETS).slice(0, 3).map(([k, url]) => (
            <Image key={k} source={{ uri: url }} style={styles.magnetSmall} resizeMode="contain" />
          ))}
        </View>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
        <Image source={{ uri: FRIDGE_URL }} style={styles.fridge} resizeMode="cover" />
        {hasUser ? (
          <TouchableOpacity testID="enter-app-btn" style={styles.swipeHint} onPress={enterApp}>
            <Text style={styles.swipeText}>Desliza hacia arriba</Text>
            <View style={styles.swipeBar} />
          </TouchableOpacity>
        ) : hasUser === false ? (
          <View style={styles.buttonsRow}>
            <TouchableOpacity testID="login-btn" style={[styles.btn, styles.btnLight]} onPress={() => router.push("/login")}>
              <Text style={styles.btnText}>Iniciar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="register-btn" style={[styles.btn, styles.btnDark]} onPress={() => router.push("/register")}>
              <Text style={[styles.btnText, { color: COLORS.white }]}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  safe: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  magnetsRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", paddingTop: 8, gap: 12 },
  magnetSmall: { width: 60, height: 60 },
  logo: { width: 180, height: 60, marginTop: 8 },
  fridge: { width: "100%", flex: 1, marginVertical: 16 },
  buttonsRow: { flexDirection: "row", gap: 12, width: "100%", paddingBottom: 24 },
  btn: { flex: 1, paddingVertical: 16, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnLight: { backgroundColor: COLORS.grayLight },
  btnDark: { backgroundColor: COLORS.text },
  btnText: { fontSize: 15, fontWeight: "700", color: COLORS.text, letterSpacing: 0.3 },
  swipeHint: { paddingBottom: 30, alignItems: "center", gap: 10 },
  swipeText: { color: COLORS.textSoft, fontSize: 13, letterSpacing: 0.5 },
  swipeBar: { width: 48, height: 4, backgroundColor: COLORS.text, borderRadius: 2 },
});
