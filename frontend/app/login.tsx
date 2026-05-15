import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, LOGO_URL, setStoredUser } from "@/src/lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) return Alert.alert("FRIGO", "Introduce tu correo");
    setLoading(true);
    try {
      const u = await api.login(email.trim().toLowerCase());
      await setStoredUser(u);
      router.replace("/(app)/parati");
    } catch (e: any) {
      Alert.alert("FRIGO", e.message || "No se ha podido iniciar sesión");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            testID="login-email"
            value={email} onChangeText={setEmail}
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor={COLORS.textSoft}
            keyboardType="email-address" autoCapitalize="none"
            style={styles.input}
          />
          <TouchableOpacity testID="login-submit" style={[styles.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
            <Text style={styles.btnText}>{loading ? "Entrando..." : "Entrar"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  logo: { width: 110, height: 32 },
  body: { padding: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text, marginBottom: 16, letterSpacing: -0.5 },
  label: { fontSize: 13, color: COLORS.textSoft, marginBottom: 4, letterSpacing: 0.3 },
  input: { backgroundColor: COLORS.grayLight, borderRadius: 10, padding: 16, fontSize: 16, color: COLORS.text },
  btn: { backgroundColor: COLORS.text, padding: 16, borderRadius: 10, alignItems: "center", marginTop: 12 },
  btnText: { color: COLORS.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
