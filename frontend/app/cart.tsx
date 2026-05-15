import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, CartItem, COLORS, getStoredUser } from "@/src/lib/api";

export default function Cart() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");

  useEffect(() => {
    getStoredUser().then(u => {
      if (!u) { Alert.alert("FRIGO", "Inicia sesión"); return; }
      setUserId(u.id);
      api.getCart(u.id).then(c => setItems(c.items || []));
    });
  }, []);

  const persist = async (next: CartItem[]) => {
    setItems(next);
    if (userId) await api.updateCart(userId, next);
  };

  const remove = (idx: number) => {
    persist(items.filter((_, i) => i !== idx));
  };

  const clear = () => {
    Alert.alert("Vaciar cesta", "¿Seguro que quieres eliminar todo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Vaciar", style: "destructive", onPress: () => persist([]) },
    ]);
  };

  const addPersonal = () => {
    const n = newName.trim();
    if (!n) return;
    const q = Math.max(1, parseInt(newQty, 10) || 1);
    persist([...items, { name: n, quantity: q, kind: "personal" }]);
    setNewName("");
    setNewQty("1");
    setAddOpen(false);
  };

  // Group items by source label.
  const grouped: { label: string; kind: "recipe" | "personal"; items: { item: CartItem; idx: number }[] }[] = [];
  items.forEach((it, idx) => {
    const kind = it.kind === "personal" ? "personal" : "recipe";
    const label = kind === "personal" ? "Personal" : (it.recipe_name || "Otras recetas");
    let g = grouped.find(g => g.label === label && g.kind === kind);
    if (!g) {
      g = { label, kind, items: [] };
      grouped.push(g);
    }
    g.items.push({ item: it, idx });
  });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cesta de la compra</Text>
        <TouchableOpacity onPress={clear} style={{ padding: 8 }} testID="clear-cart" disabled={items.length === 0}>
          <Ionicons name="trash-outline" size={20} color={items.length === 0 ? COLORS.gray : COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
        {items.length === 0 && (
          <Text style={styles.empty}>Tu cesta está vacía.{"\n"}Añade ingredientes desde una receta o pulsa "+" para añadirlos a mano.</Text>
        )}
        {grouped.map((g, gi) => (
          <View key={gi} style={styles.group}>
            <View style={styles.groupHeader}>
              {g.kind === "personal" ? (
                <View style={[styles.tag, styles.tagPersonal]}>
                  <Ionicons name="person-outline" size={12} color={COLORS.white} />
                  <Text style={styles.tagTextPersonal}>Personal</Text>
                </View>
              ) : (
                <View style={styles.tag}>
                  <Ionicons name="restaurant-outline" size={12} color={COLORS.text} />
                  <Text style={styles.tagText} numberOfLines={1}>{g.label}</Text>
                </View>
              )}
            </View>
            {g.items.map(({ item, idx }) => (
              <View key={idx} style={styles.row} testID={`cart-item-${idx}`}>
                <Text style={styles.itemText}>
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                </Text>
                <TouchableOpacity onPress={() => remove(idx)} testID={`remove-${idx}`} hitSlop={10}>
                  <Ionicons name="close-circle-outline" size={22} color={COLORS.textSoft} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity testID="cart-add-fab" style={styles.fab} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.h1}>Añadir a tu cesta</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)} testID="cart-add-close">
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Producto</Text>
            <TextInput
              testID="cart-new-name"
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Ej. Aceite de oliva 500 ml"
              placeholderTextColor={COLORS.textSoft}
              autoFocus
            />
            <Text style={styles.label}>Cantidad</Text>
            <TextInput
              testID="cart-new-qty"
              style={styles.input}
              value={newQty}
              onChangeText={setNewQty}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={COLORS.textSoft}
            />
            <TouchableOpacity testID="cart-add-submit" style={styles.btn} onPress={addPersonal}>
              <Text style={styles.btnText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  group: { gap: 8 },
  groupHeader: { flexDirection: "row", alignItems: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.gray, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, maxWidth: "70%" },
  tagText: { fontSize: 11, fontWeight: "700", color: COLORS.text },
  tagPersonal: { backgroundColor: COLORS.text },
  tagTextPersonal: { fontSize: 11, fontWeight: "700", color: COLORS.white },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: COLORS.grayLight, borderRadius: 10, gap: 12 },
  itemText: { flex: 1, fontSize: 14, color: COLORS.text },
  empty: { color: COLORS.textSoft, textAlign: "center", marginTop: 60, padding: 20, lineHeight: 22 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: COLORS.text,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 6,
  },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.white, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  h1: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  label: { fontSize: 12, color: COLORS.textSoft, marginTop: 6, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: COLORS.gray, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
  btn: { backgroundColor: COLORS.text, padding: 14, borderRadius: 10, alignItems: "center", marginTop: 14 },
  btnText: { color: COLORS.white, fontWeight: "700" },
});
