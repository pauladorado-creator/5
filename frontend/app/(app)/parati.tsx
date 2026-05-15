import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, MAGNETS, Recipe } from "@/src/lib/api";
import { useCooked } from "@/src/lib/cooked";
import { FrigoHeader, FrigoFooter } from "@/src/components/Chrome";

function getSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "Primavera";
  if (m >= 5 && m <= 7) return "Verano";
  if (m >= 8 && m <= 10) return "Otoño";
  return "Invierno";
}

const NOTIFS = [
  "Filtra las recetas por intolerancias y alergias",
  "Sube tu foto de las recetas, completa comunidades autónomas y consigue los imanes de recompensa",
];

export default function ParaTi() {
  const router = useRouter();
  const [tab, setTab] = useState<"parati" | "explorar">("parati");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ccaaList, setCcaaList] = useState<string[]>([]);
  const [notifs, setNotifs] = useState(NOTIFS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ exclude_gluten: false, exclude_lactose: false, exclude_nuts: false, vegan: false });
  const [sortAsc, setSortAsc] = useState(true);
  const season = getSeason();
  const { cookedIds, reload: reloadCooked } = useCooked();

  const load = async () => {
    if (tab === "parati") {
      const r = await api.listRecipes({ season, ...filters });
      setRecipes(r);
    } else {
      const c = await api.getCCAA();
      setCcaaList(c.ccaa);
    }
  };

  useEffect(() => { load(); }, [tab, filters]);
  useEffect(() => { reloadCooked(); }, []);

  const sorted = [...recipes].sort((a, b) => sortAsc ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre));

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <FrigoHeader tab={tab} onTabChange={setTab} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {notifs.map((m, i) => (
          <View key={i} style={styles.notif} testID={`notif-${i}`}>
            <Text style={styles.notifText}>{m}</Text>
            <TouchableOpacity onPress={() => setNotifs(notifs.filter((_, j) => j !== i))} testID={`notif-close-${i}`}>
              <Ionicons name="close" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        ))}
        {tab === "parati" ? (
          <View style={styles.section}>
            <Text style={styles.h1}>Con productos de temporada</Text>
            <Text style={styles.sub}>{season} · {sorted.length} recetas</Text>
            <View style={{ gap: 12, marginTop: 16 }}>
              {sorted.slice(0, 12).map(r => {
                const done = cookedIds.has(r.id);
                return (
                  <TouchableOpacity key={r.id} testID={`recipe-${r.id}`} style={styles.card} onPress={() => router.push(`/recipe/${r.id}`)}>
                    <View style={styles.cardThumb}>
                      {done && MAGNETS[r.ccaa] ? (
                        <Image source={{ uri: MAGNETS[r.ccaa] }} style={styles.cardThumbMagnet} resizeMode="contain" />
                      ) : (
                        <Text style={styles.cardThumbText}>{r.ccaa.slice(0, 3).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{r.nombre}</Text>
                        {done && <Ionicons name="checkmark-circle" size={16} color={COLORS.text} />}
                      </View>
                      <Text style={styles.cardMeta}>{r.ccaa} · {r.tiempo} · {r.dificultad}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.h1}>De qué comunidad te sientes hoy</Text>
            <Text style={styles.sub}>Elige y descubre sus recetas</Text>
            <View style={styles.grid}>
              {ccaaList.map(c => (
                <TouchableOpacity key={c} testID={`ccaa-${c}`} style={styles.ccaaBox} onPress={() => router.push(`/ccaa/${encodeURIComponent(c)}`)}>
                  {MAGNETS[c] ? <Image source={{ uri: MAGNETS[c] }} style={styles.magnet} resizeMode="contain" /> : <View style={styles.magnetPlaceholder} />}
                  <Text style={styles.ccaaText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <FrigoFooter onFilter={() => setFiltersOpen(true)} onSort={() => setSortAsc(!sortAsc)} />
      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.h1}>Filtros</Text>
            {[
              { k: "exclude_gluten", label: "Sin gluten" },
              { k: "exclude_lactose", label: "Sin lactosa" },
              { k: "exclude_nuts", label: "Sin frutos secos" },
              { k: "vegan", label: "Apto vegano" },
            ].map(f => (
              <View key={f.k} style={styles.filterRow}>
                <Text style={styles.filterLabel}>{f.label}</Text>
                <Switch
                  testID={`filter-${f.k}`}
                  value={(filters as any)[f.k]}
                  onValueChange={v => setFilters({ ...filters, [f.k]: v })}
                />
              </View>
            ))}
            <TouchableOpacity testID="filters-close" style={styles.btn} onPress={() => setFiltersOpen(false)}>
              <Text style={styles.btnText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.white },
  notif: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.grayLight, marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 10, gap: 10 },
  notifText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  section: { padding: 16 },
  h1: { fontSize: 22, fontWeight: "800", color: COLORS.text, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: COLORS.textSoft, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.grayLight, padding: 14, borderRadius: 10, gap: 14 },
  cardThumb: { width: 56, height: 56, backgroundColor: COLORS.gray, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardThumbText: { fontWeight: "800", color: COLORS.text, letterSpacing: 1 },
  cardThumbMagnet: { width: 50, height: 50 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSoft, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  ccaaBox: { width: "31%", aspectRatio: 1, backgroundColor: COLORS.grayLight, borderRadius: 10, alignItems: "center", justifyContent: "center", padding: 6 },
  magnet: { width: 50, height: 50 },
  magnetPlaceholder: { width: 50, height: 50, backgroundColor: COLORS.gray, borderRadius: 25 },
  ccaaText: { fontSize: 11, color: COLORS.text, marginTop: 6, textAlign: "center", fontWeight: "600" },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.white, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  filterLabel: { fontSize: 15, color: COLORS.text },
  btn: { backgroundColor: COLORS.text, padding: 14, borderRadius: 10, alignItems: "center", marginTop: 10 },
  btnText: { color: COLORS.white, fontWeight: "700" },
});
