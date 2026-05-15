import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, MAGNETS, Recipe } from "@/src/lib/api";
import { useCooked } from "@/src/lib/cooked";
import { useSettings, sortRecipes, SortBy } from "@/src/lib/settings";
import { allergenLabels } from "@/src/lib/substitutions";
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

const SORT_LABELS: Record<SortBy, string> = {
  alphabetical: "Alfabéticamente (A-Z)",
  difficulty: "Por dificultad",
  time: "Por tiempo de preparación",
  price: "Por precio de receta",
  favorites: "Por favoritos de los usuarios",
};

const MODE_OPTIONS: { k: "hide" | "warn" | "substitute"; label: string; desc: string }[] = [
  { k: "hide", label: "No me muestres recetas intolerantes", desc: "Las ocultamos del listado." },
  { k: "warn", label: "Muéstrame pero avísame", desc: "Aparecen con aviso en rojo." },
  { k: "substitute", label: "Modifica las recetas", desc: "Sustituimos los ingredientes (ej. pan → pan sin gluten)." },
];

export default function ParaTi() {
  const router = useRouter();
  const [tab, setTab] = useState<"parati" | "explorar">("parati");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ccaaList, setCcaaList] = useState<string[]>([]);
  const [notifs, setNotifs] = useState(NOTIFS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const season = getSeason();
  const { cookedIds, reload: reloadCooked } = useCooked();
  const { filters, setFilters, sort, setSort } = useSettings();

  const load = async () => {
    if (tab === "parati") {
      // Only push exclude_* to backend when mode === "hide"; otherwise fetch all.
      const params: any = { season };
      if (filters.mode === "hide") {
        if (filters.exclude_gluten) params.exclude_gluten = true;
        if (filters.exclude_lactose) params.exclude_lactose = true;
        if (filters.exclude_nuts) params.exclude_nuts = true;
      }
      if (filters.vegan) params.vegan = true;
      const r = await api.listRecipes(params);
      setRecipes(r);
    } else {
      const c = await api.getCCAA();
      setCcaaList(c.ccaa);
    }
  };

  useEffect(() => { load(); }, [tab, filters]);
  useEffect(() => { reloadCooked(); }, []);

  const anyAllergyFilter = filters.exclude_gluten || filters.exclude_lactose || filters.exclude_nuts;
  const warnsFor = (r: Recipe): string[] => {
    if (filters.mode !== "warn" || !anyAllergyFilter) return [];
    const out: string[] = [];
    if (filters.exclude_gluten && r.alergenos.gluten) out.push("gluten");
    if (filters.exclude_lactose && r.alergenos.lactosa) out.push("lactosa");
    if (filters.exclude_nuts && r.alergenos.frutos_secos) out.push("frutos secos");
    return out;
  };

  const sorted = sortRecipes(recipes, sort);

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
            <Text style={styles.sub}>{season} · {sorted.length} recetas · {SORT_LABELS[sort.by]}</Text>
            <View style={{ gap: 12, marginTop: 16 }}>
              {sorted.slice(0, 24).map(r => {
                const done = cookedIds.has(r.id);
                const warns = warnsFor(r);
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
                        {warns.length > 0 && (
                          <Ionicons name="warning" size={16} color="#D92D20" testID={`warn-${r.id}`} />
                        )}
                        {done && <Ionicons name="checkmark-circle" size={16} color={COLORS.text} />}
                      </View>
                      <Text style={styles.cardMeta}>{r.ccaa} · {r.tiempo} · {r.dificultad}{typeof r.precio === "number" ? ` · ${r.precio.toFixed(2)}€` : ""}</Text>
                      {warns.length > 0 && (
                        <Text style={styles.warnText}>Contiene: {warns.join(", ")}</Text>
                      )}
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

      <FrigoFooter onFilter={() => setFiltersOpen(true)} onSort={() => setSortOpen(true)} />

      {/* Filters modal */}
      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.h1}>Filtros</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)} testID="filters-close-x">
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.h2}>Intolerancias y dietas</Text>
            {[
              { k: "exclude_gluten", label: "Gluten" },
              { k: "exclude_lactose", label: "Lactosa" },
              { k: "exclude_nuts", label: "Frutos secos" },
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

            <Text style={[styles.h2, { marginTop: 6 }]}>Qué hacemos con las recetas afectadas</Text>
            {MODE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.k}
                testID={`mode-${opt.k}`}
                style={[styles.modeRow, filters.mode === opt.k && styles.modeRowActive]}
                onPress={() => setFilters({ ...filters, mode: opt.k })}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={filters.mode === opt.k ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={filters.mode === opt.k ? COLORS.text : COLORS.textSoft}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeLabel}>{opt.label}</Text>
                  <Text style={styles.modeDesc}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity testID="filters-apply" style={styles.btn} onPress={() => setFiltersOpen(false)}>
              <Text style={styles.btnText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sort modal */}
      <Modal visible={sortOpen} animationType="slide" transparent onRequestClose={() => setSortOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.h1}>Ordenar</Text>
              <TouchableOpacity onPress={() => setSortOpen(false)} testID="sort-close-x">
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {(Object.keys(SORT_LABELS) as SortBy[]).map(k => (
              <TouchableOpacity
                key={k}
                testID={`sort-${k}`}
                style={[styles.modeRow, sort.by === k && styles.modeRowActive]}
                onPress={() => setSort({ ...sort, by: k })}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={sort.by === k ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={sort.by === k ? COLORS.text : COLORS.textSoft}
                />
                <Text style={[styles.modeLabel, { flex: 1 }]}>{SORT_LABELS[k]}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Orden ascendente</Text>
              <Switch testID="sort-asc" value={sort.asc} onValueChange={v => setSort({ ...sort, asc: v })} />
            </View>
            <TouchableOpacity testID="sort-apply" style={styles.btn} onPress={() => setSortOpen(false)}>
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
  h2: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginTop: 12, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.textSoft, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.grayLight, padding: 14, borderRadius: 10, gap: 14 },
  cardThumb: { width: 56, height: 56, backgroundColor: COLORS.gray, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardThumbText: { fontWeight: "800", color: COLORS.text, letterSpacing: 1 },
  cardThumbMagnet: { width: 50, height: 50 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.textSoft, marginTop: 2 },
  warnText: { fontSize: 11, color: "#D92D20", marginTop: 4, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  ccaaBox: { width: "31%", aspectRatio: 1, backgroundColor: COLORS.grayLight, borderRadius: 10, alignItems: "center", justifyContent: "center", padding: 6 },
  magnet: { width: 50, height: 50 },
  magnetPlaceholder: { width: 50, height: 50, backgroundColor: COLORS.gray, borderRadius: 25 },
  ccaaText: { fontSize: 11, color: COLORS.text, marginTop: 6, textAlign: "center", fontWeight: "600" },
  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.white, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 8, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  filterLabel: { fontSize: 15, color: COLORS.text },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  modeRowActive: { backgroundColor: COLORS.grayLight },
  modeLabel: { fontSize: 14, color: COLORS.text, fontWeight: "700" },
  modeDesc: { fontSize: 12, color: COLORS.textSoft, marginTop: 2 },
  btn: { backgroundColor: COLORS.text, padding: 14, borderRadius: 10, alignItems: "center", marginTop: 16 },
  btnText: { color: COLORS.white, fontWeight: "700", letterSpacing: 0.4 },
});
