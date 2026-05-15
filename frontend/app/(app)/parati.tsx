import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Switch, Animated, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, COLORS, MAGNETS, Recipe, recipeImageUrl } from "@/src/lib/api";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState<null | "info" | "privacy" | "opinions">(null);
  const [ingredientQuery, setIngredientQuery] = useState("");
  const season = getSeason();
  const { cookedIds, reload: reloadCooked } = useCooked();
  const { filters, setFilters, sort, setSort } = useSettings();

  // Auto-hide fridge bar on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);
  const headerVisible = useRef(true);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const dy = y - lastY.current;
        if (dy > 8 && y > 40 && headerVisible.current) {
          headerVisible.current = false;
          Animated.timing(headerAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
        } else if ((dy < -8 || y <= 20) && !headerVisible.current) {
          headerVisible.current = true;
          Animated.timing(headerAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
        }
        lastY.current = y;
      },
    },
  );

  const load = async () => {
    if (tab === "parati") {
      const params: any = { season };
      if (filters.mode === "hide") {
        if (filters.exclude_gluten) params.exclude_gluten = true;
        if (filters.exclude_lactose) params.exclude_lactose = true;
        if (filters.exclude_nuts) params.exclude_nuts = true;
      }
      if (filters.vegan) params.vegan = true;
      if (ingredientQuery.trim()) params.ingredients = ingredientQuery.trim();
      const r = await api.listRecipes(params);
      setRecipes(r);
    } else {
      const c = await api.getCCAA();
      setCcaaList(c.ccaa);
    }
  };

  useEffect(() => { load(); }, [tab, filters, ingredientQuery]);
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
      <FrigoHeader tab={tab} onTabChange={setTab} onFavorite={() => router.push("/saved")} onMenu={() => setMenuOpen(true)} />

      <Animated.View
        style={[
          styles.fridgeBar,
          {
            opacity: headerAnim,
            maxHeight: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
            paddingVertical: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
          },
        ]}
      >
        <Text style={styles.fridgeTitle}>¿Qué tienes en la nevera?</Text>
        <View style={styles.fridgeInputWrap}>
          <Ionicons name="search" size={16} color={COLORS.textSoft} />
          <TextInput
            testID="ingredient-search"
            value={ingredientQuery}
            onChangeText={setIngredientQuery}
            placeholder="Escribe ingredientes separados por comas (ej. tomate, ajo)"
            placeholderTextColor={COLORS.textSoft}
            style={styles.fridgeInput}
            returnKeyType="search"
          />
          {ingredientQuery.length > 0 && (
            <TouchableOpacity onPress={() => setIngredientQuery("")} testID="ingredient-clear" hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSoft} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} scrollEventThrottle={16} onScroll={onScroll}>
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
                      {recipeImageUrl(r.image_url) ? (
                        <Image source={{ uri: recipeImageUrl(r.image_url)! }} style={styles.cardThumbImg} resizeMode="cover" />
                      ) : done && MAGNETS[r.ccaa] ? (
                        <Image source={{ uri: MAGNETS[r.ccaa] }} style={styles.cardThumbMagnet} resizeMode="contain" />
                      ) : (
                        <Text style={styles.cardThumbText}>{r.ccaa.slice(0, 3).toUpperCase()}</Text>
                      )}
                      {done && MAGNETS[r.ccaa] && (
                        <Image source={{ uri: MAGNETS[r.ccaa] }} style={styles.cardThumbOverlay} resizeMode="contain" />
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
      </Animated.ScrollView>

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

      {/* Drawer menu */}
      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.drawerRoot}>
          <View style={styles.drawerCard}>
            <View style={styles.drawerHeader}>
              <Text style={styles.h1}>FRIGO</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)} testID="drawer-close">
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity testID="drawer-info" style={styles.drawerItem} onPress={() => { setMenuOpen(false); setInfoOpen("info"); }}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.text} />
              <Text style={styles.drawerItemText}>Información de la app</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="drawer-privacy" style={styles.drawerItem} onPress={() => { setMenuOpen(false); setInfoOpen("privacy"); }}>
              <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.text} />
              <Text style={styles.drawerItemText}>Política y privacidad</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="drawer-opinions" style={styles.drawerItem} onPress={() => { setMenuOpen(false); setInfoOpen("opinions"); }}>
              <Ionicons name="star-outline" size={22} color={COLORS.text} />
              <Text style={styles.drawerItemText}>Opiniones</Text>
            </TouchableOpacity>
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Versión 1.0 · Hecho con cariño</Text>
            </View>
          </View>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setMenuOpen(false)} testID="drawer-backdrop" />
        </View>
      </Modal>

      {/* Drawer content panels */}
      <Modal visible={!!infoOpen} animationType="slide" transparent onRequestClose={() => setInfoOpen(null)}>
        <View style={styles.modalRoot}>
          <View style={[styles.modalCard, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.h1}>
                {infoOpen === "info" && "Sobre FRIGO"}
                {infoOpen === "privacy" && "Política y privacidad"}
                {infoOpen === "opinions" && "Opiniones"}
              </Text>
              <TouchableOpacity onPress={() => setInfoOpen(null)} testID="info-close">
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingVertical: 8, gap: 10 }}>
              {infoOpen === "info" && (
                <Text style={styles.infoBody}>
                  FRIGO es tu recetario español de bolsillo. Descubre la cocina tradicional de las 17 comunidades autónomas, marca tus recetas favoritas, sube fotos de tus platos y consigue imanes coleccionables para tu nevera virtual.{"\n\n"}
                  Incluye filtros por intolerancias (gluten, lactosa, frutos secos, vegano), sustitución automática de ingredientes, búsqueda por lo que tienes en la nevera, cesta de la compra y un asistente de cocina con IA.
                </Text>
              )}
              {infoOpen === "privacy" && (
                <Text style={styles.infoBody}>
                  Tu privacidad nos importa. Almacenamos únicamente los datos imprescindibles: email, nombre de usuario, lista de recetas hechas/guardadas y tus fotos personales.{"\n\n"}
                  · No compartimos tus datos con terceros con fines publicitarios.{"\n"}
                  · Las fotos que subes se guardan asociadas a tu cuenta y solo tú puedes verlas.{"\n"}
                  · Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento escribiendo a hola@frigo.app.{"\n\n"}
                  Esta es una versión MVP y aún no implementa toda la normativa GDPR; antes del lanzamiento público se actualizará con la política completa.
                </Text>
              )}
              {infoOpen === "opinions" && (
                <View>
                  {[
                    { name: "Laura M.", stars: 5, txt: "Las recetas son muy claras y los imanes me han enganchado un montón. ¡Ya llevo 4 comunidades!" },
                    { name: "Carlos R.", stars: 5, txt: "Lo de modificar la receta cuando hay intolerancias es brutal, mi pareja es celiaca y ya no tenemos que adivinar." },
                    { name: "María P.", stars: 4, txt: "Me encanta poder buscar por lo que tengo en la nevera. Solo le falta poder compartir con amigos." },
                    { name: "Dani G.", stars: 5, txt: "El chat de la app me ayudó a improvisar una cena el otro día. Recomendadísima." },
                  ].map((o, i) => (
                    <View key={i} style={styles.opinionRow}>
                      <Text style={styles.opinionAuthor}>{o.name}</Text>
                      <Text style={styles.opinionStars}>{"★".repeat(o.stars)}{"☆".repeat(5 - o.stars)}</Text>
                      <Text style={styles.opinionText}>{o.txt}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity testID="info-ok" style={styles.btn} onPress={() => setInfoOpen(null)}>
              <Text style={styles.btnText}>Entendido</Text>
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
  fridgeBar: { paddingHorizontal: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray, overflow: "hidden" },
  fridgeTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text, textAlign: "center", letterSpacing: -0.2 },
  fridgeInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: COLORS.gray },
  fridgeInput: { flex: 1, fontSize: 13, color: COLORS.text, padding: 0 },
  drawerRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row" },
  drawerCard: { width: "78%", height: "100%", backgroundColor: COLORS.white, padding: 20, gap: 4 },
  drawerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  drawerItemText: { fontSize: 15, color: COLORS.text, fontWeight: "600" },
  drawerFooter: { marginTop: "auto", paddingTop: 14 },
  drawerFooterText: { fontSize: 11, color: COLORS.textSoft },
  infoBody: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  opinionRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  opinionAuthor: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  opinionStars: { color: "#F2A005", marginVertical: 2, letterSpacing: 1 },
  opinionText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  notifText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
  section: { padding: 16 },
  h1: { fontSize: 22, fontWeight: "800", color: COLORS.text, letterSpacing: -0.4 },
  h2: { fontSize: 14, fontWeight: "800", color: COLORS.text, marginTop: 12, marginBottom: 4 },
  sub: { fontSize: 13, color: COLORS.textSoft, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.grayLight, padding: 14, borderRadius: 10, gap: 14 },
  cardThumb: { width: 64, height: 64, backgroundColor: COLORS.gray, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cardThumbImg: { width: 64, height: 64 },
  cardThumbOverlay: { position: "absolute", bottom: -2, right: -2, width: 28, height: 28 },
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
