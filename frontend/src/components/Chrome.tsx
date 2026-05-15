import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, LOGO_URL } from "@/src/lib/api";

export function FrigoHeader({
  tab, onTabChange, onMenu, onFavorite,
}: { tab: "parati" | "explorar"; onTabChange: (t: "parati" | "explorar") => void; onMenu?: () => void; onFavorite?: () => void; }) {
  return (
    <View>
      <View style={styles.top}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.row}>
        <TouchableOpacity testID="menu-btn" onPress={onMenu} style={styles.iconBtn}>
          <Ionicons name="menu" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.tabs}>
          <TouchableOpacity testID="tab-parati" onPress={() => onTabChange("parati")}>
            <Text style={[styles.tab, tab === "parati" && styles.tabActive]}>Para ti</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="tab-explorar" onPress={() => onTabChange("explorar")}>
            <Text style={[styles.tab, tab === "explorar" && styles.tabActive]}>Explorar</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity testID="favorite-btn" onPress={onFavorite} style={styles.iconBtn}>
          <Ionicons name="bookmark-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function FrigoFooter({ onFilter, onSort }: { onFilter?: () => void; onSort?: () => void }) {
  const router = useRouter();
  return (
    <View style={fStyles.footer}>
      <TouchableOpacity testID="chat-btn" onPress={() => router.push("/chat")} style={fStyles.iconBtn}>
        <Ionicons name="chatbubble-outline" size={22} color={COLORS.text} />
      </TouchableOpacity>
      <TouchableOpacity testID="filter-btn" onPress={onFilter} style={fStyles.center}>
        <Ionicons name="options-outline" size={20} color={COLORS.text} />
        <Text style={fStyles.label}>Filtrar</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="sort-btn" onPress={onSort} style={fStyles.center}>
        <Ionicons name="swap-vertical-outline" size={20} color={COLORS.text} />
        <Text style={fStyles.label}>Ordenar</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="cart-btn" onPress={() => router.push("/cart")} style={fStyles.iconBtn}>
        <Ionicons name="basket-outline" size={22} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: "center", justifyContent: "center", paddingVertical: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  logo: { width: 110, height: 30 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray },
  iconBtn: { padding: 8 },
  tabs: { flexDirection: "row", gap: 24 },
  tab: { fontSize: 15, color: COLORS.textSoft, fontWeight: "500" },
  tabActive: { color: COLORS.text, fontWeight: "800", textDecorationLine: "underline" },
});

const fStyles = StyleSheet.create({
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray },
  iconBtn: { padding: 6 },
  center: { flexDirection: "row", alignItems: "center", gap: 6, padding: 6 },
  label: { fontSize: 13, color: COLORS.text, fontWeight: "600" },
});
