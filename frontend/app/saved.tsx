import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, MAGNETS, recipeImageUrl } from "@/src/lib/api";
import { useSaved } from "@/src/lib/saved";
import { useCooked } from "@/src/lib/cooked";

export default function Saved() {
  const router = useRouter();
  const { saved, reload, toggle } = useSaved();
  const { cookedIds } = useCooked();

  useEffect(() => { reload(); }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Recetas guardadas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {saved.length === 0 && (
          <Text style={styles.empty}>
            Aún no has guardado ninguna receta.{"\n"}
            Pulsa el icono de marcador en la cabecera de una receta para añadirla aquí.
          </Text>
        )}
        {saved.map(r => {
          const done = cookedIds.has(r.id);
          return (
            <TouchableOpacity
              key={r.id}
              testID={`saved-${r.id}`}
              style={styles.card}
              onPress={() => router.push(`/recipe/${r.id}`)}
            >
              {recipeImageUrl(r.image_url) ? (
                <Image source={{ uri: recipeImageUrl(r.image_url)! }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.name} numberOfLines={1}>{r.nombre}</Text>
                  {done && MAGNETS[r.ccaa] ? (
                    <Image source={{ uri: MAGNETS[r.ccaa] }} style={styles.miniMagnet} resizeMode="contain" />
                  ) : done ? (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.text} />
                  ) : null}
                </View>
                <Text style={styles.meta}>
                  {r.ccaa} · {r.tiempo} · {r.dificultad}
                  {typeof r.precio === "number" ? ` · ${r.precio.toFixed(2)}€` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggle(r.id)} hitSlop={10} testID={`unsave-${r.id}`}>
                <Ionicons name="bookmark" size={22} color={COLORS.text} />
              </TouchableOpacity>
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
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  empty: { color: COLORS.textSoft, textAlign: "center", marginTop: 60, padding: 20, lineHeight: 22 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.grayLight, padding: 12, borderRadius: 12 },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: COLORS.gray },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.text },
  miniMagnet: { width: 22, height: 22 },
  meta: { fontSize: 12, color: COLORS.textSoft, marginTop: 2 },
});
