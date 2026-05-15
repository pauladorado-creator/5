import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, LOGO_URL, setStoredUser } from "@/src/lib/api";

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const validateCode = () => {
    if (code.trim() !== "0000") return Alert.alert("FRIGO", "Código incorrecto");
    setStep(2);
  };

  const submit = async () => {
    if (!email.trim() || !username.trim()) return Alert.alert("FRIGO", "Completa los campos");
    setLoading(true);
    try {
      const u = await api.register(code, email.trim().toLowerCase(), username.trim());
      await setStoredUser(u);
      router.replace("/(app)/parati");
    } catch (e: any) {
      Alert.alert("FRIGO", e.message || "Error al registrarte");
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
          <Text style={styles.title}>Regístrate</Text>
          {step === 1 ? (
            <>
              <Text style={styles.label}>Código de acceso</Text>
              <TextInput
                testID="register-code"
                value={code} onChangeText={setCode}
                placeholder="0000" placeholderTextColor={COLORS.textSoft}
                keyboardType="number-pad" maxLength={4}
                style={styles.input} secureTextEntry
              />
              <TouchableOpacity testID="register-validate-code" style={styles.btn} onPress={validateCode}>
                <Text style={styles.btnText}>Continuar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Correo</Text>
              <TextInput
                testID="register-email"
                value={email} onChangeText={setEmail}
                placeholder="tucorreo@ejemplo.com" placeholderTextColor={COLORS.textSoft}
                keyboardType="email-address" autoCapitalize="none"
                style={styles.input}
              />
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput
                testID="register-username"
                value={username} onChangeText={setUsername}
                placeholder="Tu nombre" placeholderTextColor={COLORS.textSoft}
                style={styles.input}
              />
              <TouchableOpacity testID="register-submit" style={[styles.btn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
                <Text style={styles.btnText}>{loading ? "Creando..." : "Crear cuenta"}</Text>
              </TouchableOpacity>
            </>
          )}
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
