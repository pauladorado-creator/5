import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, getStoredUser } from "@/src/lib/api";

type Msg = { role: "user" | "assistant"; text: string };

export default function Chat() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "¡Hola! Soy tu asistente FRIGO. ¿Qué receta te apetece hoy?" }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionRef = useRef<string>("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { getStoredUser().then(u => { sessionRef.current = u ? `s_${u.id}` : `anon_${Date.now()}`; }); }, []);

  const send = async () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", text: t }]);
    setSending(true);
    try {
      const r = await api.chatSend(sessionRef.current || `anon_${Date.now()}`, t);
      setMsgs(m => [...m, { role: "assistant", text: r.response }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: "assistant", text: "Ups, no he podido responder ahora mismo." }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Chat FRIGO</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {msgs.map((m, i) => (
            <View key={i} testID={`msg-${i}`} style={[styles.bubble, m.role === "user" ? styles.bubbleU : styles.bubbleA]}>
              <Text style={[styles.text, m.role === "user" && { color: COLORS.white }]}>{m.text}</Text>
            </View>
          ))}
          {sending && <Text style={styles.typing}>escribiendo…</Text>}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            testID="chat-input"
            value={input} onChangeText={setInput}
            placeholder="¿Qué hago para cenar?" placeholderTextColor={COLORS.textSoft}
            style={styles.input} multiline
          />
          <TouchableOpacity testID="chat-send" style={[styles.send, sending && { opacity: 0.5 }]} onPress={send} disabled={sending}>
            <Ionicons name="arrow-up" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 14 },
  bubbleA: { backgroundColor: COLORS.grayLight, alignSelf: "flex-start" },
  bubbleU: { backgroundColor: COLORS.text, alignSelf: "flex-end" },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  typing: { color: COLORS.textSoft, fontSize: 12, fontStyle: "italic" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 10, borderTopWidth: 1, borderTopColor: COLORS.gray, gap: 8 },
  input: { flex: 1, backgroundColor: COLORS.grayLight, padding: 12, borderRadius: 20, fontSize: 14, color: COLORS.text, maxHeight: 100 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.text, alignItems: "center", justifyContent: "center" },
});
