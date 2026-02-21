import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useRef, useEffect, useCallback } from "react";
import { router } from "expo-router";
import {
  Mail,
  Shield,
  Send,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");
const API_BASE = "http://31.97.230.171:8000/api";

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  forest:      "#0B2D6B",   // primary — deep navy blue
  forestMid:   "#1A47A0",   // mid blue
  forestLight: "#3B6FD4",   // light blue
  sage:        "#C7D8F5",   // soft blue border
  sageLight:   "#EBF1FB",   // pale blue bg
  gold:        "#C9952A",   // gold accent (keep)
  white:       "#FFFFFF",
  ink:         "#111827",
  muted:       "#6B7280",
  danger:      "#DC2626",
  success:     "#16A34A",
  warn:        "#D97706",
};

// ─── Toast component ─────────────────────────────────────────
type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
}

function Toast({ message, type, visible }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

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

  const bgColor = {
    success: C.success,
    error:   C.danger,
    info:    C.forest,
  }[type];

  const icon = {
    success: <CheckCircle size={18} color="#fff" strokeWidth={2.5} />,
    error:   <Shield size={18} color="#fff" strokeWidth={2.5} />,
    info:    <Sparkles size={18} color="#fff" strokeWidth={2.5} />,
  }[type];

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { backgroundColor: bgColor, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      {icon}
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position:       "absolute",
    top:            56,
    left:           20,
    right:          20,
    flexDirection:  "row",
    alignItems:     "center",
    gap:            10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius:   14,
    zIndex:         999,
    shadowColor:    "#000",
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.18,
    shadowRadius:   12,
    elevation:      8,
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 },
});

// ─── useToast hook ────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
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

// ─── OTP digit boxes ──────────────────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const digits = value.padEnd(6, " ").split("").slice(0, 6);
  const inputRef = useRef<TextInput>(null);

  return (
    <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={1}>
      <View style={otpStyles.row}>
        {digits.map((d, i) => {
          const filled = i < value.length;
          const active = i === value.length;
          return (
            <View
              key={i}
              style={[
                otpStyles.box,
                filled && otpStyles.boxFilled,
                active && otpStyles.boxActive,
              ]}
            >
              <Text style={[otpStyles.digit, filled && otpStyles.digitFilled]}>
                {filled ? d : ""}
              </Text>
              {active && <View style={otpStyles.cursor} />}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        editable={!disabled}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />
    </TouchableOpacity>
  );
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 10 },
  box: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.sage,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
  },
  boxFilled: { borderColor: C.forestMid, backgroundColor: "#fff" },
  boxActive: { borderColor: C.forestMid, borderWidth: 2, backgroundColor: "#fff" },
  digit:       { fontSize: 22, fontWeight: "700", color: C.muted },
  digitFilled: { color: C.forest },
  cursor: {
    position:  "absolute",
    bottom:    12,
    width:     2,
    height:    20,
    backgroundColor: C.forest,
    borderRadius: 1,
  },
});

// ─── Decorative SVG-like circles via Views ─────────────────
function DecorCircles() {
  return (
    <>
      <View style={dec.c1} />
      <View style={dec.c2} />
      <View style={dec.c3} />
    </>
  );
}
const dec = StyleSheet.create({
  c1: {
    position: "absolute", top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.forestLight, opacity: 0.12,
  },
  c2: {
    position: "absolute", top: 40, right: 20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.gold, opacity: 0.10,
  },
  c3: {
    position: "absolute", top: -20, left: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.forest, opacity: 0.08,
  },
});

// ─── Dot pattern strip ────────────────────────────────────────
function DotStrip() {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 4, height: 4, borderRadius: 2,
            backgroundColor: i % 3 === 0 ? C.gold : C.sage,
            opacity: 0.6,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function StudentLogin() {
  const [email,      setEmail]      = useState("");
  const [otp,        setOtp]        = useState("");
  const [otpSent,    setOtpSent]    = useState(false);
  const [loadSend,   setLoadSend]   = useState(false);
  const [loadVerify, setLoadVerify] = useState(false);
  const { toast, showToast } = useToast();

  // Fade-in on mount
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // OTP card slide-in
  const otpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (otpSent) {
      Animated.spring(otpAnim, {
        toValue: 1, tension: 60, friction: 12, useNativeDriver: true,
      }).start();
    }
  }, [otpSent]);

  const requestOtp = async () => {
    const e = email.trim().toLowerCase();
    if (!e) { showToast("Please enter your registered email address", "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      showToast("Please enter a valid email address", "error"); return;
    }
    setLoadSend(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/student/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.detail || "Unable to send OTP. Please try again.", "error"); return;
      }
      setOtpSent(true);
      setOtp("");
      showToast("OTP sent! Check your inbox.", "success");
    } catch (err: any) {
      showToast(err?.message || "Network error — could not reach server", "error");
    } finally {
      setLoadSend(false);
    }
  };

  const verifyOtp = async () => {
    const e = email.trim().toLowerCase();
    const o = otp.trim();
    if (!e)           { showToast("Email is missing", "error"); return; }
    if (o.length < 6) { showToast("Enter the complete 6-digit OTP", "error"); return; }
    setLoadVerify(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/student/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, otp: o }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.detail || "Invalid or expired OTP", "error"); return;
      }
      const token = data?.access_token;
      if (!token) { showToast("Token missing from server response", "error"); return; }
      await AsyncStorage.multiSet([["role", "student"], ["token", token], ["student_email", e]]);
      showToast("Login successful! Redirecting…", "success");
      setTimeout(() => router.replace("/(student)/dashboard"), 800);
    } catch (err: any) {
      showToast(err?.message || "Network error — could not reach server", "error");
    } finally {
      setLoadVerify(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Header band ─────────────────────────────── */}
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

            {/* Hero image */}
            <View style={s.heroImgWrap}>
              <Image
                source={require("../assets/images/bg/login_header.png")}
                style={s.heroImg}
                resizeMode="cover"
              />
              <View style={s.heroOverlay} />
            </View>

            {/* Hero text */}
            <View style={s.heroTextWrap}>
              <View style={s.tagRow}>
                <View style={s.tag}><Text style={s.tagText}>AICTE · VTU</Text></View>
                <View style={s.tag}><Text style={s.tagText}>Social Activity Tracker</Text></View>
              </View>
              <Text style={s.heroTitle}>Track. Earn.{"\n"}Get Rewarded.</Text>
              <Text style={s.heroSub}>Log activities · Earn verified certificates</Text>
            </View>

            {/* Pull handle */}
            <View style={s.pullHandle} />
          </View>

          {/* ── Form card ──────────────────────────────── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Card header */}
            <View style={s.cardHeader}>
              <View style={s.iconCircle}>
                <Mail size={22} color={C.white} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Student Sign In</Text>
                <Text style={s.cardSub}>OTP-based · No password required</Text>
              </View>
            </View>

            <DotStrip />

            {/* Step indicator */}
            <View style={s.stepRow}>
              {["Enter Email", "Verify OTP"].map((label, i) => (
                <View key={i} style={s.stepItem}>
                  <View style={[s.stepDot, (otpSent ? i <= 1 : i === 0) && s.stepDotActive]}>
                    <Text style={s.stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={[s.stepLabel, (otpSent ? i <= 1 : i === 0) && s.stepLabelActive]}>
                    {label}
                  </Text>
                  {i < 1 && (
                    <View style={[s.stepLine, otpSent && s.stepLineActive]} />
                  )}
                </View>
              ))}
            </View>

            {/* Email field */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Registered Email Address</Text>
              <View style={[s.fieldWrap, email.length > 0 && s.fieldWrapActive]}>
                <Mail size={18} color={email.length > 0 ? C.forest : C.muted} strokeWidth={2} />
                <TextInput
                  placeholder="your.email@institution.edu"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={s.fieldInput}
                  editable={!loadSend && !loadVerify}
                />
                {email.length > 6 && (
                  <CheckCircle size={16} color={C.forestLight} strokeWidth={2.5} />
                )}
              </View>
              <Text style={s.fieldHint}>Only registered student accounts can receive OTP</Text>
            </View>

            {/* OTP field — animated in */}
            {otpSent && (
              <Animated.View
                style={[
                  s.otpSection,
                  {
                    opacity: otpAnim,
                    transform: [{ translateY: otpAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  },
                ]}
              >
                <View style={s.otpHeaderRow}>
                  <Text style={s.fieldLabel}>One-Time Passcode</Text>
                  <TouchableOpacity
                    onPress={requestOtp}
                    disabled={loadSend || loadVerify}
                    style={s.resendBtn}
                  >
                    <RefreshCw size={13} color={C.forestMid} strokeWidth={2.5} />
                    <Text style={s.resendText}>{loadSend ? "Sending…" : "Resend"}</Text>
                  </TouchableOpacity>
                </View>

                <OtpInput value={otp} onChange={setOtp} disabled={loadVerify} />

                <View style={s.otpHintRow}>
                  <Shield size={12} color={C.muted} strokeWidth={2} />
                  <Text style={s.fieldHint}>Valid for 10 minutes · Do not share with anyone</Text>
                </View>
              </Animated.View>
            )}

            {/* CTA button */}
            <TouchableOpacity
              style={[s.cta, (loadSend || loadVerify) && { opacity: 0.75 }]}
              onPress={otpSent ? verifyOtp : requestOtp}
              disabled={loadSend || loadVerify}
              activeOpacity={0.85}
            >
              {(loadSend || loadVerify) ? (
                <ActivityIndicator color="#fff" />
              ) : otpSent ? (
                <CheckCircle size={20} color="#fff" strokeWidth={2.5} />
              ) : (
                <Send size={20} color="#fff" strokeWidth={2.5} />
              )}
              <Text style={s.ctaText}>
                {loadSend ? "Sending OTP…" : loadVerify ? "Verifying…" : otpSent ? "Verify & Sign In" : "Send OTP"}
              </Text>
            </TouchableOpacity>

            {/* Gold accent strip */}
            <View style={s.goldStrip} />

            {/* Footer note */}
            <Text style={s.footerNote}>
              Vikasana Foundation · AICTE Approved · VTU Affiliated
            </Text>
          </Animated.View>

          {/* Bottom landscape */}
          <View style={s.bottomBar}>
            <Image
              source={require("../assets/images/bg/login_header.png")}
              style={s.bottomImg}
              resizeMode="cover"
            />
            <View style={s.bottomOverlay} />
            <Text style={s.bottomText}>Empowering Communities Through Education</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Main styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.forest },
  scroll: { flexGrow: 1, backgroundColor: "#F4F7F4" },

  // Header
  header: {
    backgroundColor: C.forest,
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
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  orgBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  orgText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },

  heroImgWrap: { width: "100%", height: 160, position: "relative" },
  heroImg:     { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.forest,
    opacity: 0.45,
  },

  heroTextWrap: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  tagRow:  { flexDirection: "row", gap: 8, marginBottom: 12 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: "rgba(201,149,42,0.25)",
    borderRadius: 6, borderWidth: 1,
    borderColor: "rgba(201,149,42,0.4)",
  },
  tagText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  heroTitle: {
    fontSize: 34, fontWeight: "800", color: "#fff",
    lineHeight: 40, letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "500",
  },

  pullHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center", marginTop: 20, marginBottom: 0,
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
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.forest,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  cardSub:   { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: "500" },

  // Steps
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  stepItem:  { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#E5E7EB",
    justifyContent: "center", alignItems: "center",
  },
  stepDotActive: { backgroundColor: C.forest },
  stepNum: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLabel: { fontSize: 11, color: C.muted, marginLeft: 6, fontWeight: "500" },
  stepLabelActive: { color: C.forest, fontWeight: "700" },
  stepLine: {
    flex: 1, height: 2, backgroundColor: "#E5E7EB",
    marginHorizontal: 6, borderRadius: 1,
  },
  stepLineActive: { backgroundColor: C.forest },

  // Fields
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.forest, marginBottom: 8, letterSpacing: 0.2 },
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
    marginTop: 6, fontSize: 11, color: C.muted,
    fontStyle: "italic", paddingLeft: 2,
  },

  // OTP section
  otpSection: { marginBottom: 24 },
  otpHeaderRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  resendBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  resendText: { fontSize: 13, color: C.forestMid, fontWeight: "600", textDecorationLine: "underline" },
  otpHintRow: {
    flexDirection: "row", alignItems: "center",
    gap: 6, marginTop: 14,
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
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },

  // Gold strip + footer
  goldStrip: {
    height: 3, borderRadius: 2,
    backgroundColor: C.gold,
    marginBottom: 16,
    opacity: 0.7,
  },
  footerNote: {
    textAlign: "center", fontSize: 11, color: "#9CA3AF",
    marginBottom: 28, letterSpacing: 0.3,
  },

  // Bottom bar
  bottomBar: {
    height: 100, width: "100%",
    position: "relative", overflow: "hidden",
    backgroundColor: C.forest,
  },
  bottomImg: { width: "100%", height: "100%", position: "absolute" },
  bottomOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.forest,
    opacity: 0.65,
  },
  bottomText: {
    position: "absolute",
    bottom: 20, left: 0, right: 0,
    textAlign: "center",
    fontSize: 11, color: "rgba(255,255,255,0.7)",
    fontWeight: "600", letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});