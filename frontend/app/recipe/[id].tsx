import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, getStoredUser, Recipe } from "@/src/lib/api";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Recipe | null>(null);

  useEffect(() => { if (id) api.getRecipe(String(id)).then(setR); }, [id]);

  const addAllToCart = async () => {
    if (!r) return;
    const u = await getStoredUser();
    if (!u) return Alert.alert("FRIGO", "Inicia sesión");
    const current = await api.getCart(u.id);
    const items = [...(current.items || [])];
    r.ingredientes.forEach(ing => items.push({ name: ing, quantity: 1 }));
    await api.updateCart(u.id, items);
    Alert.alert("FRIGO", "Ingredientes añadidos a la cesta");
  };

  if (!r) return <SafeAreaView style={styles.root}><Text style={styles.loading}>Cargando…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{r.nombre}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={styles.h1}>{r.nombre}</Text>
          <Text style={styles.meta}>{r.ccaa} · {r.tiempo} · {r.dificultad} · {r.raciones} raciones</Text>
        </View>
        <Text style={styles.desc}>{r.descripcion}</Text>
        <View style={styles.tagRow}>
          {!r.alergenos.gluten && <View style={styles.tag}><Text style={styles.tagText}>Sin gluten</Text></View>}
          {!r.alergenos.lactosa && <View style={styles.tag}><Text style={styles.tagText}>Sin lactosa</Text></View>}
          {!r.alergenos.frutos_secos && <View style={styles.tag}><Text style={styles.tagText}>Sin frutos secos</Text></View>}
          {r.alergenos.apto_vegano && <View style={styles.tag}><Text style={styles.tagText}>Vegano</Text></View>}
        </View>
        <Text style={styles.h2}>Ingredientes</Text>
        {r.ingredientes.map((i, idx) => <Text key={idx} style={styles.li}>· {i}</Text>)}
        <TouchableOpacity testID="add-cart" style={styles.btn} onPress={addAllToCart}>
          <Text style={styles.btnText}>Añadir a la cesta</Text>
        </TouchableOpacity>
        <Text style={styles.h2}>Preparación</Text>
        {r.preparacion.map((p, idx) => (
          <View key={idx} style={styles.step}>
            <Text style={styles.stepNum}>{idx + 1}</Text>
            <Text style={styles.stepText}>{p}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  loading: { padding: 40, textAlign: "center", color: COLORS.textSoft },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: COLORS.text },
  h1: { fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 },
  meta: { fontSize: 13, color: COLORS.textSoft, marginTop: 6 },
  desc: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: COLORS.grayLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  tagText: { fontSize: 12, color: COLORS.text, fontWeight: "600" },
  h2: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginTop: 12 },
  li: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  btn: { backgroundColor: COLORS.text, padding: 14, borderRadius: 10, alignItems: "center", marginVertical: 8 },
  btnText: { color: COLORS.white, fontWeight: "700" },
  step: { flexDirection: "row", gap: 12, marginBottom: 8 },
  stepNum: { width: 24, height: 24, backgroundColor: COLORS.text, color: COLORS.white, textAlign: "center", textAlignVertical: "center", borderRadius: 12, fontWeight: "800", lineHeight: 24 },
  stepText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
