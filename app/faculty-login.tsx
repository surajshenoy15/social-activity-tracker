import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/constants/api";
import {
  Mail,
  Lock,
  ArrowLeft,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  Sparkles,
  Link2,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  forest: "#0B2D6B", // primary — deep navy blue
  forestMid: "#1A47A0", // mid blue
  forestLight: "#3B6FD4", // light blue
  sage: "#C7D8F5", // soft blue border
  sageLight: "#EBF1FB", // pale blue bg
  gold: "#C9952A", // gold accent
  white: "#FFFFFF",
  ink: "#111827",
  muted: "#6B7280",
  danger: "#DC2626",
  success: "#16A34A",
  bgDeep: "#061845", // deepest navy for header
  bgMid: "#0B2D6B",
  headerText: "rgba(255,255,255,0.72)",
};

// ─── Toast ───────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
}

function Toast({ message, type, visible }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const bgColor = { success: C.success, error: C.danger, info: C.forest }[type];
  const icon = {
    success: <CheckCircle size={18} color="#fff" strokeWidth={2.5} />,
    error: <Shield size={18} color="#fff" strokeWidth={2.5} />,
    info: <Sparkles size={18} color="#fff" strokeWidth={2.5} />,
  }[type];

  return (
    <Animated.View
      style={[
        toastS.container,
        { backgroundColor: bgColor, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      {icon}
      <Text style={toastS.text}>{message}</Text>
    </Animated.View>
  );
}

const toastS = StyleSheet.create({
  container: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
});

function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
  }>({
    message: "",
    type: "info",
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
  }, []);

  return { toast, showToast };
}

// ─── Decorative circles ──────────────────────────────────────
function DecorCircles() {
  return (
    <>
      <View style={dec.c1} />
      <View style={dec.c2} />
      <View style={dec.c3} />
      <View style={dec.c4} />
    </>
  );
}
const dec = StyleSheet.create({
  c1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.forestLight,
    opacity: 0.1,
  },
  c2: {
    position: "absolute",
    top: 60,
    right: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.gold,
    opacity: 0.1,
  },
  c3: {
    position: "absolute",
    top: -10,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.forestMid,
    opacity: 0.1,
  },
  c4: {
    position: "absolute",
    bottom: 10,
    left: width * 0.4,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.gold,
    opacity: 0.08,
  },
});

// ─── Dot strip ───────────────────────────────────────────────
function DotStrip() {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: i % 3 === 0 ? C.gold : C.sage,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────
export default function FacultyLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast, showToast } = useToast();

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const onLogin = async () => {
    const e = email.trim().toLowerCase();
    const p = password.trim();

    if (!agreedToTerms) {
      showToast("Please agree to the Terms & Conditions and Privacy Policy", "error");
      return;
    }

    if (!e) {
      showToast("Please enter your email address", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (!p) {
      showToast("Please enter your password", "error");
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/faculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data?.detail || "Invalid email or password", "error");
        return;
      }
      if (!data?.access_token) {
        showToast("Token not received from server", "error");
        return;
      }

      await SecureStore.setItemAsync("faculty_token", data.access_token);
      await SecureStore.setItemAsync("faculty_profile", JSON.stringify(data?.faculty ?? data));
      await SecureStore.setItemAsync("terms_accepted", "true");

      showToast("Login successful! Redirecting…", "success");
      setTimeout(() => router.replace("/faculty-dashboard"), 800);
    } catch {
      showToast("Unable to connect to server", "error");
    } finally {
      setLoading(false);
    }
  };

  const buttonDisabled = loading || !agreedToTerms;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ───────────────────────────────────── */}
          <View style={s.header}>
            <DecorCircles />

            {/* Nav row */}
            <View style={s.navRow}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={s.orgBadge}>
                <Text style={s.orgText}>VIKASANA FOUNDATION</Text>
              </View>
            </View>

            {/* Blue abstract header graphic — geometric pattern */}
            <View style={s.headerGraphic}>
              <View style={s.gridWrap}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.gridCell,
                      {
                        opacity: [0, 5, 10, 15, 19, 23].includes(i)
                          ? 0.35
                          : [1, 6, 11, 16].includes(i)
                          ? 0.2
                          : 0.1,
                        backgroundColor: i % 5 === 0 ? C.gold : C.forestLight,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={s.shieldWrap}>
                <View style={s.shieldOuter}>
                  <View style={s.shieldInner}>
                    <Text style={s.shieldEmoji}>👩‍🏫</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Hero text */}
            <View style={s.heroTextWrap}>
              <View style={s.tagRow}>
                <View style={s.tag}>
                  <Text style={s.tagText}>AICTE · VTU</Text>
                </View>
                <View style={s.tag}>
                  <Text style={s.tagText}>Faculty Portal</Text>
                </View>
              </View>
              <Text style={s.heroTitle}>Verify.{"\n"}Manage.{"\n"}Empower.</Text>
              <Text style={s.heroSub}>
                Verify student activities and manage community contributions.
              </Text>
            </View>

            <View style={s.pullHandle} />
          </View>

          {/* ── Form card ──────────────────────────────── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Card header */}
            <View style={s.cardHeader}>
              <View style={s.iconCircle}>
                <Shield size={22} color={C.white} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Faculty Sign In</Text>
                <Text style={s.cardSub}>Secure access · Institutional account</Text>
              </View>
            </View>

            <DotStrip />

            {/* Step indicator */}
            <View style={s.stepRow}>
              {["Credentials", "Access Dashboard"].map((label, i) => (
                <View key={i} style={s.stepItem}>
                  <View style={[s.stepDot, i === 0 && s.stepDotActive]}>
                    <Text style={s.stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={[s.stepLabel, i === 0 && s.stepLabelActive]}>{label}</Text>
                  {i < 1 && <View style={s.stepLine} />}
                </View>
              ))}
            </View>

            {/* Email field */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Email Address</Text>
              <View style={[s.fieldWrap, focusEmail && s.fieldWrapActive]}>
                <Mail size={18} color={focusEmail || email.length > 0 ? C.forest : C.muted} strokeWidth={2} />
                <TextInput
                  placeholder="faculty@institution.edu"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  style={s.fieldInput}
                  editable={!loading}
                />
                {email.length > 6 && (
                  <CheckCircle size={16} color={C.forestLight} strokeWidth={2.5} />
                )}
              </View>
            </View>

            {/* Password field */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={[s.fieldWrap, focusPass && s.fieldWrapActive]}>
                <Lock size={18} color={focusPass || password.length > 0 ? C.forest : C.muted} strokeWidth={2} />
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusPass(true)}
                  onBlur={() => setFocusPass(false)}
                  style={s.fieldInput}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                  {showPass ? (
                    <EyeOff size={18} color={C.muted} strokeWidth={2} />
                  ) : (
                    <Eye size={18} color={C.muted} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={s.fieldHint}>Use your institutional credentials to sign in</Text>
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity
              style={s.checkboxRow}
              activeOpacity={0.85}
              onPress={() => setAgreedToTerms((prev) => !prev)}
              disabled={loading}
            >
              <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
                {agreedToTerms && (
                  <CheckCircle size={14} color="#fff" strokeWidth={2.8} />
                )}
              </View>

              <Text style={s.checkboxText}>
                I agree to the{" "}
                <Text
                  style={s.termsLink}
                  onPress={() => router.push("/(student)/terms-faq")}
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  style={s.termsLink}
                  onPress={() => router.push("/(student)/terms-faq")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* CTA */}
            <Pressable
              onPress={onLogin}
              disabled={buttonDisabled}
              style={({ pressed }) => [
                s.cta,
                buttonDisabled && s.ctaDisabled,
                pressed && !buttonDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <LogIn size={20} color="#fff" strokeWidth={2.5} />
              )}
              <Text style={s.ctaText}>{loading ? "Signing In…" : "Sign In to Portal"}</Text>
            </Pressable>

            {/* Activate link */}
            <TouchableOpacity onPress={() => router.push("/faculty-activate")} style={s.activateBtn}>
              <Link2 size={14} color={C.forestMid} strokeWidth={2} />
              <Text style={s.activateText}>
                Have an activation link? <Text style={s.activateLink}>Activate account</Text>
              </Text>
            </TouchableOpacity>

            {/* Gold strip */}
            <View style={s.goldStrip} />
            <TouchableOpacity
              onPress={() => router.push("/(student)/terms-faq")}
              activeOpacity={0.8}
              style={s.termsRow}
            >
              <Shield size={13} color={C.muted} strokeWidth={2} />
              <Text style={s.termsText}>
                Please review our <Text style={s.termsLink}>Terms & Conditions</Text> and{" "}
                <Text style={s.termsLink}>Privacy Policy</Text> before continuing
              </Text>
            </TouchableOpacity>

            {/* Footer note */}
            <Text style={s.footerNote}>
              Vikasana Foundation · AICTE Approved · VTU Affiliated
            </Text>
          </Animated.View>

          {/* Bottom bar */}
          <View style={s.bottomBar}>
            <View style={s.wave1} />
            <View style={s.wave2} />
            <View style={s.wave3} />
            <Text style={s.bottomText}>Empowering Communities Through Education</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgDeep },
  scroll: { flexGrow: 1, backgroundColor: "#F4F7FC" },

  // Header
  header: {
    backgroundColor: C.bgDeep,
    paddingBottom: 0,
    overflow: "hidden",
    position: "relative",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  orgBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  orgText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },

  // Blue header graphic
  headerGraphic: {
    width: "100%",
    height: 160,
    backgroundColor: C.bgMid,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  gridWrap: {
    position: "absolute",
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    height: "100%",
    padding: 12,
    gap: 8,
  },
  gridCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  shieldWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  shieldOuter: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "rgba(59,111,212,0.3)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  shieldInner: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: C.forestMid,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.forestLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  shieldEmoji: { fontSize: 32 },

  heroTextWrap: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(201,149,42,0.2)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.35)",
  },
  tagText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
  },

  pullHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginTop: 20,
  },

  // Card
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -14,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    flex: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.forest,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  cardSub: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: "500" },

  // Steps
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: { backgroundColor: C.forest },
  stepNum: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLabel: { fontSize: 11, color: C.muted, marginLeft: 6, fontWeight: "500" },
  stepLabelActive: { color: C.forest, fontWeight: "700" },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 6,
    borderRadius: 1,
  },

  // Fields
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.forest,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.sageLight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.sage,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  fieldWrapActive: { borderColor: C.forestMid, backgroundColor: "#fff" },
  fieldInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: C.ink },
  fieldHint: {
    marginTop: 6,
    fontSize: 11,
    color: C.muted,
    fontStyle: "italic",
    paddingLeft: 2,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: C.sage,
    backgroundColor: C.sageLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: C.forest,
    borderColor: C.forest,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    fontWeight: "500",
  },

  // CTA
  cta: {
    backgroundColor: C.forest,
    paddingVertical: 17,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },

  // Activate
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
    marginBottom: 24,
  },
  activateText: { fontSize: 13, color: C.muted, textAlign: "center" },
  activateLink: { color: C.forestMid, fontWeight: "700" },

  // Gold strip + footer
  goldStrip: {
    height: 3,
    borderRadius: 2,
    backgroundColor: C.gold,
    marginBottom: 16,
    opacity: 0.7,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 28,
    letterSpacing: 0.3,
  },

  // Bottom bar
  bottomBar: {
    height: 100,
    width: "100%",
    backgroundColor: C.bgDeep,
    overflow: "hidden",
    justifyContent: "flex-end",
    paddingBottom: 20,
    position: "relative",
  },
  wave1: {
    position: "absolute",
    top: -30,
    width: width * 1.4,
    height: 80,
    borderRadius: 100,
    backgroundColor: C.forestMid,
    opacity: 0.25,
    left: -width * 0.2,
  },
  wave2: {
    position: "absolute",
    top: -10,
    width: width * 1.2,
    height: 60,
    borderRadius: 80,
    backgroundColor: C.forestLight,
    opacity: 0.15,
    left: -width * 0.1,
  },
  wave3: {
    position: "absolute",
    top: 10,
    width: width,
    height: 50,
    borderRadius: 60,
    backgroundColor: C.gold,
    opacity: 0.06,
  },
  bottomText: {
    textAlign: "center",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    fontWeight: "500",
  },
  termsLink: {
    color: C.forestMid,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});