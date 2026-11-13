// Tugas 7.6.3 – Halaman Profil berisi informasi kelompok
import { ScrollView, Text, View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { group } from "../data/group.js";
import { BACKEND_URL, MQTT_BROKER_URL, MQTT_TOPIC } from "../services/config.js";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;
const AVATAR_COLORS = ["#2563EB", "#0EA5E9", "#7C3AED", "#DB2777"];

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={color.text3} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {value ?? "-"}
        </Text>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View entering={FadeInDown.duration(260)} style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>27</Text>
        </View>
        <Text style={styles.heroTitle}>{group.name}</Text>
        <Text style={styles.heroSub}>
          {group.course} · {group.shift}
        </Text>
        <View style={styles.heroChip}>
          <Ionicons name="school-outline" size={14} color={color.primary} />
          <Text style={styles.heroChipText}>{group.department}</Text>
        </View>
      </Animated.View>

      <Text style={styles.sectionTitle}>Anggota Kelompok</Text>
      <View style={styles.card}>
        {group.members.map((m, i) => (
          <Animated.View
            key={m.nim}
            entering={FadeInDown.delay(80 * (i + 1)).duration(260)}
            style={[styles.memberRow, i > 0 && styles.memberDivider]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] },
              ]}
            >
              <Text style={styles.avatarText}>{initials(m.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={styles.memberNim}>NIM {m.nim}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Informasi Aplikasi</Text>
      <View style={styles.card}>
        <InfoRow icon="book-outline" label="Praktikum" value={group.module} />
        <InfoRow icon="server-outline" label="Backend REST API" value={BACKEND_URL} />
        <InfoRow icon="cloud-outline" label="MQTT Broker" value={MQTT_BROKER_URL} />
        <InfoRow icon="radio-outline" label="MQTT Topic" value={MQTT_TOPIC} />
      </View>
      <Text style={styles.footer}>LiveTemp · {group.name} · {group.year}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  hero: {
    alignItems: "center",
    gap: 6,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    borderRadius: radius.card,
    borderCurve: "continuous",
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
  },
  heroBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primary,
    marginBottom: space.sm,
  },
  heroBadgeText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: color.text },
  heroSub: { fontSize: 13, color: color.text2, textAlign: "center" },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: "#EFF6FF",
  },
  heroChipText: { fontSize: 12, fontWeight: "600", color: color.primary },
  sectionTitle: {
    marginTop: space.sm,
    fontSize: tokens.type.section,
    fontWeight: "700",
    color: color.text,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    boxShadow: shadow.card,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
  },
  memberDivider: { borderTopWidth: 1, borderTopColor: color.border },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  memberName: { fontSize: 15, fontWeight: "600", color: color.text },
  memberNim: {
    fontSize: 13,
    color: color.text3,
    fontVariant: ["tabular-nums"],
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
  },
  infoLabel: { fontSize: 12, color: color.text3 },
  infoValue: { fontSize: 14, color: color.text, fontWeight: "500" },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: color.text3,
    marginTop: space.md,
  },
});
