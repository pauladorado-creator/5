import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, COLORS, getStoredUser, MAGNETS, Recipe, setStoredUser } from "@/src/lib/api";
import { useCooked } from "@/src/lib/cooked";

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [r, setR] = useState<Recipe | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { cookedIds, reload: reloadCooked, addCooked } = useCooked();

  useEffect(() => {
    if (!id) return;
    api.getRecipe(String(id)).then(setR);
    (async () => {
      const u = await getStoredUser();
      if (!u) return;
      try {
        const res = await api.getCookedPhoto(u.id, String(id));
        if (res?.photo) setPhoto(res.photo);
      } catch {}
    })();
  }, [id]);

  const isCooked = id ? cookedIds.has(String(id)) : false;

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

  const pickAndUpload = async (mode: "camera" | "library") => {
    if (!r) return;
    const u = await getStoredUser();
    if (!u) return Alert.alert("FRIGO", "Inicia sesión primero");

    const perm = mode === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("FRIGO", "Necesitamos acceso para añadir tu foto");
    }

    const result = mode === "camera"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: true, aspect: [1, 1] });

    if (result.canceled || !result.assets?.[0]?.base64) return;
    const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;

    setUploading(true);
    try {
      const res = await api.cookRecipe(String(id), u.id, b64);
      setPhoto(b64);
      addCooked(String(id));
      await reloadCooked();
      // Refresh user (may now have a new magnet)
      try {
        const fresh = await api.getUser(u.id);
        await setStoredUser(fresh);
      } catch {}
      if (res.awarded_magnet) {
        Alert.alert(
          "¡Imán conseguido!",
          `Has desbloqueado el imán coleccionable de ${res.ccaa}. Pasa por la nevera para verlo.`,
        );
      } else {
        Alert.alert(
          "Receta marcada",
          `Llevas ${res.cooked_in_ccaa} de ${res.total_in_ccaa} recetas de ${res.ccaa}.`,
        );
      }
    } catch (e: any) {
      Alert.alert("FRIGO", e?.message || "No se pudo guardar la foto");
    } finally {
      setUploading(false);
    }
  };

  const onUploadPress = () => {
    Alert.alert(
      "Tu foto",
      "¿Cómo quieres añadirla?",
      [
        { text: "Cámara", onPress: () => pickAndUpload("camera") },
        { text: "Galería", onPress: () => pickAndUpload("library") },
        { text: "Cancelar", style: "cancel" },
      ],
    );
  };

  if (!r) return <SafeAreaView style={styles.root}><Text style={styles.loading}>Cargando…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} testID="back-btn">
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{r.nombre}</Text>
        <View style={{ width: 40, alignItems: "center" }}>
          {isCooked && MAGNETS[r.ccaa] ? (
            <Image source={{ uri: MAGNETS[r.ccaa] }} style={styles.headerBadge} resizeMode="contain" />
          ) : isCooked ? (
            <Ionicons name="checkmark-circle" size={22} color={COLORS.text} />
          ) : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View>
          <Text style={styles.h1}>{r.nombre}</Text>
          <Text style={styles.meta}>{r.ccaa} · {r.tiempo} · {r.dificultad} · {r.raciones} raciones</Text>
        </View>

        {photo ? (
          <View style={styles.photoCard}>
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
            <View style={styles.photoOverlay}>
              {MAGNETS[r.ccaa] ? (
                <Image source={{ uri: MAGNETS[r.ccaa] }} style={styles.miniMagnet} resizeMode="contain" />
              ) : (
                <Ionicons name="checkmark-circle" size={28} color={COLORS.white} />
              )}
              <Text style={styles.photoLabel}>Hecha por ti</Text>
            </View>
            <TouchableOpacity testID="replace-photo" style={styles.replaceBtn} onPress={onUploadPress} disabled={uploading}>
              <Ionicons name="camera-reverse-outline" size={16} color={COLORS.white} />
              <Text style={styles.replaceText}>Cambiar foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity testID="upload-photo" style={styles.uploadBtn} onPress={onUploadPress} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={20} color={COLORS.white} />
                <Text style={styles.uploadText}>Sube tu foto de esta receta</Text>
              </>
            )}
          </TouchableOpacity>
        )}

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
  headerBadge: { width: 28, height: 28 },
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
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.text,
    padding: 16,
    borderRadius: 12,
  },
  uploadText: { color: COLORS.white, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  photoCard: { position: "relative", borderRadius: 14, overflow: "hidden", backgroundColor: COLORS.grayLight },
  photo: { width: "100%", aspectRatio: 1 },
  photoOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  miniMagnet: { width: 26, height: 26 },
  photoLabel: { color: COLORS.white, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  replaceBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  replaceText: { color: COLORS.white, fontSize: 12, fontWeight: "600" },
});
