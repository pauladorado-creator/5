import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, getStoredUser, Recipe } from "@/src/lib/api";

export default function CCAARecipes() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const ccaa = decodeURIComponent(String(name || ""));
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => { api.listRecipes({ ccaa }).then(setRecipes); }, [ccaa]);

  const earn = async () => {
    const u = await getStoredUser();
    if (!u) return Alert.alert("FRIGO", "Inicia sesión primero");
    await api.earnMagnet(u.id, ccaa);
    Alert.alert("FRIGO", `¡Imán de ${ccaa} conseguido!`);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{ccaa}</Text>
        <TouchableOpacity onPress={earn} style={{ padding: 8 }} testID="earn-magnet">
          <Ionicons name="ribbon-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {recipes.length === 0 && <Text style={styles.empty}>Sin recetas todavía para esta comunidad.</Text>}
        {recipes.map(r => (
          <TouchableOpacity key={r.id} testID={`recipe-${r.id}`} style={styles.card} onPress={() => router.push(`/recipe/${r.id}`)}>
            <Text style={styles.cardTitle}>{r.nombre}</Text>
            <Text style={styles.cardMeta}>{r.tiempo} · {r.dificultad} · {r.temporada}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  card: { backgroundColor: COLORS.grayLight, padding: 16, borderRadius: 10 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSoft, marginTop: 4 },
  empty: { color: COLORS.textSoft, textAlign: "center", marginTop: 40 },
});
