import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, getStoredUser } from "@/src/lib/api";

type Item = { name: string; quantity: number };

export default function Cart() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getStoredUser().then(u => {
      if (!u) { Alert.alert("FRIGO", "Inicia sesión"); return; }
      setUserId(u.id);
      api.getCart(u.id).then(c => setItems(c.items || []));
    });
  }, []);

  const remove = async (idx: number) => {
    if (!userId) return;
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    await api.updateCart(userId, next);
  };

  const clear = async () => {
    if (!userId) return;
    setItems([]);
    await api.updateCart(userId, []);
  };

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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {items.length === 0 && <Text style={styles.empty}>Tu cesta está vacía. Añade ingredientes desde cualquier receta.</Text>}
        {items.map((it, idx) => (
          <View key={idx} style={styles.row} testID={`cart-item-${idx}`}>
            <Text style={styles.itemText}>{it.name}</Text>
            <TouchableOpacity onPress={() => remove(idx)} testID={`remove-${idx}`}>
              <Ionicons name="close-circle-outline" size={22} color={COLORS.textSoft} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, backgroundColor: COLORS.grayLight, borderRadius: 10, gap: 12 },
  itemText: { flex: 1, fontSize: 14, color: COLORS.text },
  empty: { color: COLORS.textSoft, textAlign: "center", marginTop: 60, padding: 20, lineHeight: 22 },
});
