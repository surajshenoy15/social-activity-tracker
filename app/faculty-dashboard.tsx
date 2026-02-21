import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bgDeep:       "#0a1628",
  bgMid:        "#0d2044",
  accent:       "#1565c0",
  accentBright: "#1e88e5",
  surface:      "#ffffff",
  surfaceAlt:   "#f4f7fc",
  border:       "#dce6f5",
  text:         "#0a1628",
  textMuted:    "#5a7099",
  textLight:    "#ffffff",
};

// ── Action card config ────────────────────────────────────────────────────────
const ACTIONS: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  route?: string;
}[] = [
  { title: "Scan Attendance", icon: "qr-code-outline",          color: "#0ea5e9" },
  { title: "Verify Activity", icon: "checkmark-circle-outline", color: "#22c55e" },
  { title: "Add Report",      icon: "document-text-outline",    color: "#f59e0b" },
  { title: "Students",        icon: "people-outline",           color: "#6366f1", route: "/add-students" },
];

export default function FacultyDashboard() {
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState<any>(null);

  const headerOp = useRef(new Animated.Value(0)).current;
  const headerY  = useRef(new Animated.Value(-30)).current;
  const cardsOp  = useRef(new Animated.Value(0)).current;
  const cardsY   = useRef(new Animated.Value(40)).current;

  const loadLocalProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      if (!token) { router.replace("/faculty-login"); return; }
      const profileStr = await SecureStore.getItemAsync("faculty_profile");
      if (!profileStr) { setFaculty(null); return; }
      const parsed = JSON.parse(profileStr);
      setFaculty(parsed?.faculty ?? parsed);
    } catch {
      Alert.alert("Error", "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLocalProfile(); }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.spring(headerY,  { toValue: 0, useNativeDriver: true, tension: 55, friction: 10 }),
        Animated.timing(headerOp, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(cardsY,   { toValue: 0, useNativeDriver: true, tension: 45, friction: 9, delay: 180 }),
        Animated.timing(cardsOp,  { toValue: 1, duration: 450, delay: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const logout = async () => {
    await SecureStore.deleteItemAsync("faculty_token");
    await SecureStore.deleteItemAsync("faculty_profile");
    router.replace("/faculty-login");
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loaderText}>Loading Dashboard…</Text>
      </View>
    );
  }

  const name     = faculty?.full_name || faculty?.name || "Faculty";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerY }] }]}
        >
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>Vikasana Foundation</Text>
              <Text style={styles.brandTagline}>EMPOWERING COMMUNITIES</Text>
            </View>
            <Pressable onPress={logout} hitSlop={12}>
              <Ionicons name="power-outline" size={22} color="#8ab4d9" />
            </Pressable>
          </View>

          {/* Welcome row */}
          <View style={styles.welcomeRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeLabel}>Welcome back</Text>
              <Text style={styles.welcomeName} numberOfLines={1}>{name}</Text>
              <Text style={styles.welcomeSub}>{faculty?.college || "Faculty Member"}</Text>
            </View>
          </View>

          {/* Stat strip */}
          <View style={styles.statStrip}>
            <StatPill label="Activities" value="12" />
            <View style={styles.statDivider} />
            <StatPill label="Verified" value="9" />
            <View style={styles.statDivider} />
            <StatPill label="Pending" value="3" />
          </View>
        </Animated.View>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: cardsOp, transform: [{ translateY: cardsY }] }}>

          {/* Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <View style={styles.card}>
              <ProfileRow icon="mail-outline"                   label="Email"  value={faculty?.email || "—"} />
              <View style={styles.cardDivider} />
              <ProfileRow icon="school-outline"                 label="Role"   value="Faculty Member" />
              <View style={styles.cardDivider} />
              <ProfileRow icon="checkmark-done-circle-outline"  label="Status" value="Active" valueColor="#22c55e" />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {ACTIONS.map((a) => (
                <ActionCard key={a.title} {...a} />
              ))}
            </View>
          </View>

          {/* Today's Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Summary</Text>
            <View style={styles.summaryRow}>
              <SummaryCard label="Activities" value="12" color={C.accent}  icon="calendar-outline" />
              <SummaryCard label="Verified"   value="9"  color="#22c55e"   icon="checkmark-circle-outline" />
              <SummaryCard label="Pending"    value="3"  color="#f59e0b"   icon="time-outline" />
            </View>
          </View>

          {/* Sign Out */}
          <View style={{ marginHorizontal: 20, marginTop: 10 }}>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </Pressable>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileRow({
  icon, label, value, valueColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.profileRow}>
      <Ionicons name={icon} size={18} color={C.accentBright} />
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={[styles.profileValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

function ActionCard({
  title, icon, color, route,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  route?: string;
}) {
  const scale      = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    if (route) router.push(route as any);
  };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} style={{ width: "47%" }}>
      <Animated.View style={[styles.actionCard, { backgroundColor: color, transform: [{ scale }] }]}>
        <View style={styles.actionIconWrap}>
          <Ionicons name={icon} size={22} color="rgba(255,255,255,0.95)" />
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(255,255,255,0.55)"
          style={styles.actionChevron}
        />
      </Animated.View>
    </Pressable>
  );
}

function SummaryCard({
  label, value, color, icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.surfaceAlt },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.surface },
  loaderText: { marginTop: 12, color: C.textMuted, fontSize: 14 },

  header: {
    backgroundColor: C.bgDeep,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  brandRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  logoBox:      { width: 36, height: 36, borderRadius: 9, backgroundColor: C.accentBright, justifyContent: "center", alignItems: "center" },
  logoText:     { color: C.textLight, fontWeight: "800", fontSize: 16 },
  brandName:    { color: C.textLight, fontWeight: "700", fontSize: 13 },
  brandTagline: { color: "#7baad4", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 1 },

  welcomeRow:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 },
  avatar:       { width: 52, height: 52, borderRadius: 16, backgroundColor: C.accentBright, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" },
  avatarText:   { color: C.textLight, fontWeight: "800", fontSize: 18 },
  welcomeLabel: { color: "#8ab4d9", fontSize: 12, fontWeight: "600" },
  welcomeName:  { color: C.textLight, fontSize: 20, fontWeight: "800", marginTop: 2 },
  welcomeSub:   { color: "#7baad4", fontSize: 12, marginTop: 3 },

  statStrip:   { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  statPill:    { flex: 1, alignItems: "center" },
  statValue:   { color: C.textLight, fontSize: 22, fontWeight: "800" },
  statLabel:   { color: "#8ab4d9", fontSize: 11, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },

  section:      { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },

  card:        { backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardDivider: { height: 1, backgroundColor: C.border },
  profileRow:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  profileLabel:{ flex: 1, fontSize: 14, color: C.textMuted, fontWeight: "600" },
  profileValue:{ fontSize: 14, color: C.text, fontWeight: "700" },

  actionsGrid:    { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  actionCard:     { borderRadius: 18, padding: 16, paddingBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  actionTitle:    { color: C.textLight, fontWeight: "700", fontSize: 14 },
  actionChevron:  { position: "absolute", bottom: 16, right: 14 },

  summaryRow:     { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  summaryCard:    { flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 18, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  summaryIconWrap:{ width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  summaryValue:   { fontSize: 24, fontWeight: "800" },
  summaryLabel:   { color: C.textMuted, fontSize: 11, fontWeight: "600", marginTop: 4 },

  logoutBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 14, paddingVertical: 14, backgroundColor: "#fff5f5" },
  logoutBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});