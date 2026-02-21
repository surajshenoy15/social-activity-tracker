import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/constants/api";

// ── Vikasana palette ──────────────────────────────────────────────────────────
const C = {
  bgDeep:     "#0a1628",   // dark navy (header bg)
  bgMid:      "#0d2044",   // mid navy
  accent:     "#1565c0",   // primary blue
  accentBright:"#1e88e5",  // lighter blue for glow / focus
  surface:    "#ffffff",   // card surface
  surfaceAlt: "#f4f7fc",   // input background
  border:     "#dce6f5",
  text:       "#0a1628",
  textMuted:  "#5a7099",
  textLight:  "#ffffff",
  labelBlue:  "#1565c0",
};

export default function FacultyLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [focusedField, setFocused] = useState<"email"|"password"|null>(null);

  // Entrance animations
  const headerY  = useRef(new Animated.Value(-40)).current;
  const headerOp = useRef(new Animated.Value(0)).current;
  const cardY    = useRef(new Animated.Value(60)).current;
  const cardOp   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY,  { toValue: 0,   useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.timing(headerOp, { toValue: 1,   duration: 500, useNativeDriver: true }),
      Animated.spring(cardY,    { toValue: 0,   useNativeDriver: true, tension: 50, friction: 9, delay: 150 }),
      Animated.timing(cardOp,   { toValue: 1,   duration: 500, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Details", "Please enter email & password");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/faculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert("Login Failed", data?.detail || "Invalid email or password");
        return;
      }
      if (!data?.access_token) {
        Alert.alert("Login Failed", "Token not received from server");
        return;
      }

      await SecureStore.setItemAsync("faculty_token", data.access_token);
      await SecureStore.setItemAsync(
        "faculty_profile",
        JSON.stringify(data?.faculty ?? data)
      );

      router.replace("/faculty-dashboard");
    } catch {
      Alert.alert("Network Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header band ────────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerY }] }]}
        >
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Vikasana Foundation</Text>
              <Text style={styles.brandTagline}>EMPOWERING COMMUNITIES</Text>
            </View>
          </View>

          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SOCIAL ACTIVITY TRACKER</Text>
          </View>

          {/* Hero text */}
          <Text style={styles.heroTitle}>Verify.{"\n"}Manage.{"\n"}Empower.</Text>
          <Text style={styles.heroSub}>
            Verify student activities and manage community contributions.
          </Text>
        </Animated.View>

        {/* ── Card ───────────────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.card, { opacity: cardOp, transform: [{ translateY: cardY }] }]}
        >
          {/* Faculty icon row */}
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 28 }}>👩‍🏫</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>Faculty Login</Text>
              <Text style={styles.cardSub}>Verify &amp; manage student activities</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <View style={[styles.inputWrap, focusedField === "email" && styles.inputFocused]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="faculty@institution.edu"
              placeholderTextColor={C.textMuted}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              style={styles.input}
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <View style={[styles.inputWrap, focusedField === "password" && styles.inputFocused]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
              placeholderTextColor={C.textMuted}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              style={styles.input}
            />
          </View>

          {/* Login button */}
          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.btn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              loading && { opacity: 0.7 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>Sign In</Text>
                <Text style={styles.btnArrow}>›</Text>
              </>
            )}
          </Pressable>

          {/* Activate link */}
          <Pressable
            onPress={() => router.push("/faculty-activate")}
            style={styles.activateBtn}
          >
            <Text style={styles.activateText}>
              Have an activation link?{" "}
              <Text style={styles.activateLink}>Activate account</Text>
            </Text>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <Text style={styles.footer}>Made with ❤️ for Vikasana Foundation</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDeep },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: {
    backgroundColor: C.bgDeep,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
  },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 },
  logoBox: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: C.accentBright,
    justifyContent: "center", alignItems: "center",
  },
  logoText:    { color: C.textLight, fontWeight: "800", fontSize: 18 },
  brandName:   { color: C.textLight, fontWeight: "700", fontSize: 14 },
  brandTagline:{ color: "#7baad4",   fontWeight: "600", fontSize: 9, letterSpacing: 1.5, marginTop: 1 },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 18,
  },
  badgeText: { color: "#a8c8f0", fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },

  heroTitle: {
    color: C.textLight,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 48,
    marginBottom: 12,
  },
  heroSub: { color: "#8ab4d9", fontSize: 14, lineHeight: 21, maxWidth: 280 },

  // ── Card ──
  card: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    padding: 28,
    paddingTop: 32,
    // subtle top shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },

  iconRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  iconCircle: {
    width: 54, height: 54,
    borderRadius: 16,
    backgroundColor: "#e8f0fe",
    justifyContent: "center", alignItems: "center",
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  cardSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },

  divider: { height: 1, backgroundColor: C.border, marginBottom: 22 },

  label: { fontSize: 12, fontWeight: "700", color: C.textMuted, letterSpacing: 0.8, marginBottom: 6 },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surfaceAlt,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 0,
    gap: 10,
  },
  inputFocused: { borderColor: C.accentBright, backgroundColor: "#f0f6ff" },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: C.text, paddingVertical: Platform.OS === "android" ? 12 : 0 },

  btn: {
    marginTop: 24,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText:  { color: C.textLight, fontSize: 16, fontWeight: "700" },
  btnArrow: { color: C.textLight, fontSize: 22, fontWeight: "300", lineHeight: 22 },

  activateBtn: { marginTop: 20, alignItems: "center" },
  activateText: { fontSize: 13, color: C.textMuted, textAlign: "center" },
  activateLink: { color: C.labelBlue, fontWeight: "700" },

  footer: { color: "#4a6a8a", textAlign: "center", fontSize: 12, paddingVertical: 20 },
});