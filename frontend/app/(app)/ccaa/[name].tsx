import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, MAGNETS, Recipe } from "@/src/lib/api";
import { useCooked } from "@/src/lib/cooked";

export default function CCAARecipes() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const ccaa = decodeURIComponent(String(name || ""));
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { cookedIds } = useCooked();

  useEffect(() => { api.listRecipes({ ccaa }).then(setRecipes); }, [ccaa]);

  const cookedInCcaa = recipes.filter(r => cookedIds.has(r.id)).length;
  const total = recipes.length;
  const pct = total ? cookedInCcaa / total : 0;
  const magnetUri = MAGNETS[ccaa];
  const unlocked = total > 0 && cookedInCcaa >= total;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{ccaa}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressLeft}>
          {magnetUri ? (
            <Image
              source={{ uri: magnetUri }}
              style={[styles.magnet, !unlocked && { opacity: 0.25 }]}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.magnetEmpty} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.progressTitle}>
            {unlocked ? "¡Imán conseguido!" : "Colecciona el imán"}
          </Text>
          <Text style={styles.progressMeta}>{cookedInCcaa} de {total} recetas hechas</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {recipes.length === 0 && <Text style={styles.empty}>Sin recetas todavía para esta comunidad.</Text>}
        {recipes.map(r => {
          const done = cookedIds.has(r.id);
          return (
            <TouchableOpacity key={r.id} testID={`recipe-${r.id}`} style={styles.card} onPress={() => router.push(`/recipe/${r.id}`)}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{r.nombre}</Text>
                  {done && magnetUri ? (
                    <Image source={{ uri: magnetUri }} style={styles.miniMagnet} resizeMode="contain" />
                  ) : done ? (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.text} />
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>{r.tiempo} · {r.dificultad} · {r.temporada}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSoft} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.grayLight,
    borderRadius: 14,
  },
  progressLeft: { width: 64, alignItems: "center", justifyContent: "center" },
  magnet: { width: 64, height: 64 },
  magnetEmpty: { width: 64, height: 64, backgroundColor: COLORS.gray, borderRadius: 32 },
  progressTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  progressMeta: { fontSize: 12, color: COLORS.textSoft, marginTop: 2 },
  bar: { height: 6, backgroundColor: COLORS.gray, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: COLORS.text },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.grayLight, padding: 16, borderRadius: 10 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.text },
  miniMagnet: { width: 26, height: 26 },
  cardMeta: { fontSize: 12, color: COLORS.textSoft, marginTop: 4 },
  empty: { color: COLORS.textSoft, textAlign: "center", marginTop: 40 },
});
