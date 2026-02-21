import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  ArrowLeft, Link2, Mail, Shield, KeyRound, CheckCircle,
  Eye, EyeOff, Send, Lock, Sparkles, ChevronRight,
} from "lucide-react-native";
import { API_BASE } from "@/constants/api";

const { width } = Dimensions.get("window");

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  forest:      "#0B2D6B",
  forestMid:   "#1A47A0",
  forestLight: "#3B6FD4",
  sage:        "#C7D8F5",
  sageLight:   "#EBF1FB",
  gold:        "#C9952A",
  white:       "#FFFFFF",
  ink:         "#111827",
  muted:       "#6B7280",
  danger:      "#DC2626",
  success:     "#16A34A",
  bgDeep:      "#061845",
  bg:          "#F0F4FC",
};

type Step = "token" | "otp" | "password" | "done";
type ToastType = "success" | "error" | "info";

// ─── Toast ───────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
    msg: "", type: "info", visible: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type, visible: true });
    timer.current = setTimeout(() => setToast(p => ({ ...p, visible: false })), 3200);
  }, []);
  return { toast, show };
}

function Toast({ msg, type, visible }: { msg: string; type: ToastType; visible: boolean }) {
  const tY = useRef(new Animated.Value(-90)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(tY, { toValue: visible ? 0 : -90, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(op, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible]);
  const bg = { success: C.success, error: C.danger, info: C.forest }[type];
  const Icon = { success: CheckCircle, error: Shield, info: Sparkles }[type];
  return (
    <Animated.View style={[ts.wrap, { backgroundColor: bg, transform: [{ translateY: tY }], opacity: op }]} pointerEvents="none">
      <Icon size={17} color="#fff" strokeWidth={2.5} />
      <Text style={ts.text}>{msg}</Text>
    </Animated.View>
  );
}
const ts = StyleSheet.create({
  wrap: { position: "absolute", top: 56, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, zIndex: 999, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  text: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 },
});

// ─── OTP digit boxes ─────────────────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);
  return (
    <TouchableOpacity onPress={() => inputRef.current?.focus()} activeOpacity={1}>
      <View style={ot.row}>
        {digits.map((d, i) => {
          const filled = i < value.length;
          const active = i === value.length;
          return (
            <View key={i} style={[ot.box, filled && ot.boxFilled, active && ot.boxActive]}>
              <Text style={[ot.digit, filled && ot.digitFilled]}>{filled ? d : ""}</Text>
              {active && <View style={ot.cursor} />}
            </View>
          );
        })}
      </View>
      <TextInput ref={inputRef} value={value} onChangeText={t => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad" maxLength={6} editable={!disabled}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
    </TouchableOpacity>
  );
}
const ot = StyleSheet.create({
  row:        { flexDirection: "row", justifyContent: "center", gap: 10 },
  box:        { width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: C.sage, backgroundColor: C.sageLight, justifyContent: "center", alignItems: "center" },
  boxFilled:  { borderColor: C.forestMid, backgroundColor: C.white },
  boxActive:  { borderColor: C.forestMid, borderWidth: 2, backgroundColor: C.white },
  digit:      { fontSize: 22, fontWeight: "700", color: C.muted },
  digitFilled:{ color: C.forest },
  cursor:     { position: "absolute", bottom: 12, width: 2, height: 20, backgroundColor: C.forest, borderRadius: 1 },
});

// ─── Decorative circles ──────────────────────────────────────
function DecorCircles() {
  return (
    <>
      <View style={dc.c1} />
      <View style={dc.c2} />
      <View style={dc.c3} />
    </>
  );
}
const dc = StyleSheet.create({
  c1: { position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: C.forestLight, opacity: 0.10 },
  c2: { position: "absolute", top: 60, right: 30, width: 80, height: 80, borderRadius: 40, backgroundColor: C.gold, opacity: 0.10 },
  c3: { position: "absolute", top: -10, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: C.forestMid, opacity: 0.10 },
});

// ─── Step indicator ───────────────────────────────────────────
const STEPS: { key: Step; label: string }[] = [
  { key: "token",    label: "Token"    },
  { key: "otp",      label: "OTP"      },
  { key: "password", label: "Password" },
  { key: "done",     label: "Done"     },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <View style={s.stepRow}>
      {STEPS.map((step, i) => (
        <View key={step.key} style={s.stepItem}>
          <View style={[s.stepDot, i <= idx && s.stepDotActive]}>
            {i < idx
              ? <CheckCircle size={14} color={C.white} strokeWidth={2.5} />
              : <Text style={s.stepNum}>{i + 1}</Text>
            }
          </View>
          <Text style={[s.stepLabel, i <= idx && s.stepLabelActive]}>{step.label}</Text>
          {i < STEPS.length - 1 && <View style={[s.stepLine, i < idx && s.stepLineActive]} />}
        </View>
      ))}
    </View>
  );
}

// ─── Field component ──────────────────────────────────────────
function Field({ label, icon: Icon, placeholder, value, onChangeText, secure, multiline, keyboardType, autoCapitalize, hint }: {
  label: string; icon: any; placeholder: string; value: string;
  onChangeText: (t: string) => void; secure?: boolean; multiline?: boolean;
  keyboardType?: any; autoCapitalize?: any; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [show,    setShow]    = useState(false);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldWrap, focused && s.fieldWrapActive]}>
        <Icon size={17} color={focused ? C.forest : value.length > 0 ? C.forestMid : C.muted} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secure && !show}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.fieldInput, multiline && { minHeight: 80, textAlignVertical: "top", paddingTop: 10 }]}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(v => !v)} hitSlop={8}>
            {show ? <EyeOff size={17} color={C.muted} strokeWidth={2} /> : <Eye size={17} color={C.muted} strokeWidth={2} />}
          </TouchableOpacity>
        )}
        {!secure && value.length > 0 && <CheckCircle size={15} color={C.forestLight} strokeWidth={2.5} />}
      </View>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
    </View>
  );
}

// ─── DotStrip ─────────────────────────────────────────────────
function DotStrip() {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: i % 3 === 0 ? C.gold : C.sage, opacity: 0.6 }} />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function FacultyActivate() {
  const params = useLocalSearchParams<{ token?: string }>();
  const initialToken = useMemo(() => (typeof params.token === "string" ? params.token : ""), [params.token]);

  const [step,             setStep]             = useState<Step>("token");
  const [token,            setToken]            = useState(initialToken);
  const [sessionId,        setSessionId]        = useState("");
  const [maskedEmail,      setMaskedEmail]      = useState("");
  const [otp,              setOtp]              = useState("");
  const [setPasswordToken, setSetPasswordToken] = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [loading,          setLoading]          = useState(false);
  const { toast, show } = useToast();

  // Entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Step 1: validate token ──────────────────────────────────
  const validateToken = async () => {
    if (!token.trim()) { show("Paste your activation token", "error"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/faculty/activation/validate?token=${encodeURIComponent(token.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(data?.detail || "Invalid or expired token", "error"); return; }
      setSessionId(data.activation_session_id);
      setMaskedEmail(data.email_masked);
      show("Token validated! Sending OTP…", "success");
      // Auto-send OTP
      await sendOtp(data.activation_session_id);
      setStep("otp");
    } catch { show("Network error — could not reach server", "error"); }
    finally { setLoading(false); }
  };

  // ── Step 2: send OTP ────────────────────────────────────────
  const sendOtp = async (sid?: string) => {
    const id = sid ?? sessionId;
    if (!id) { show("Validate token first", "error"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/faculty/activation/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_session_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(data?.detail || "Failed to send OTP", "error"); return; }
      show(`OTP sent to ${maskedEmail || "your email"}`, "info");
    } catch { show("Network error", "error"); }
    finally { setLoading(false); }
  };

  // ── Step 3: verify OTP ──────────────────────────────────────
  const verifyOtp = async () => {
    if (otp.length < 6) { show("Enter the complete 6-digit OTP", "error"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/faculty/activation/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_session_id: sessionId, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(data?.detail || "Invalid OTP", "error"); return; }
      setSetPasswordToken(data.set_password_token || "");
      show("OTP verified! Set your password.", "success");
      setStep("password");
    } catch { show("Network error", "error"); }
    finally { setLoading(false); }
  };

  // ── Step 4: set password ─────────────────────────────────────
  const setPassword = async () => {
    if (newPassword.length < 6)      { show("Password must be at least 6 characters", "error"); return; }
    if (newPassword !== confirmPassword) { show("Passwords do not match", "error"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/faculty/activation/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set_password_token: setPasswordToken, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { show(data?.detail || "Failed to set password", "error"); return; }
      show("Account activated successfully!", "success");
      setStep("done");
    } catch { show("Network error", "error"); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Header ─────────────────────────────────── */}
          <View style={s.header}>
            <DecorCircles />

            <View style={s.navRow}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={s.orgBadge}>
                <Text style={s.orgText}>VIKASANA FOUNDATION</Text>
              </View>
            </View>

            {/* Blue geometric graphic — same as FacultyLogin */}
            <View style={s.headerGraphic}>
              <View style={s.gridWrap}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <View key={i} style={[s.gridCell, {
                    opacity: [0, 5, 10, 15, 19, 23].includes(i) ? 0.35 : [1, 6, 11, 16].includes(i) ? 0.20 : 0.10,
                    backgroundColor: i % 5 === 0 ? C.gold : C.forestLight,
                  }]} />
                ))}
              </View>
              <View style={s.shieldWrap}>
                <View style={s.shieldOuter}>
                  <View style={s.shieldInner}>
                    <Text style={{ fontSize: 30 }}>🔐</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Hero text */}
            <View style={s.heroTextWrap}>
              <View style={s.tagRow}>
                <View style={s.tag}><Text style={s.tagText}>AICTE · VTU</Text></View>
                <View style={s.tag}><Text style={s.tagText}>Account Activation</Text></View>
              </View>
              <Text style={s.heroTitle}>Activate Your{"\n"}Faculty Account.</Text>
              <Text style={s.heroSub}>Complete verification to gain full platform access.</Text>
            </View>

            <View style={s.pullHandle} />
          </View>

          {/* ── Card ───────────────────────────────────── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            <View style={s.cardHeader}>
              <View style={s.iconCircle}>
                <Link2 size={22} color={C.white} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Faculty Activation</Text>
                <Text style={s.cardSub}>4-step secure account setup</Text>
              </View>
            </View>

            <DotStrip />

            <StepIndicator current={step} />

            {/* ── STEP: Token ────────────────────────── */}
            {step === "token" && (
              <>
                <Field
                  label="Activation Token"
                  icon={Link2}
                  placeholder="Paste the token from your invitation email"
                  value={token}
                  onChangeText={setToken}
                  multiline
                  hint="Check your inbox for the invitation email from Vikasana Foundation"
                />
                <TouchableOpacity
                  style={[s.cta, loading && { opacity: 0.75 }]}
                  onPress={validateToken} disabled={loading} activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <ChevronRight size={20} color="#fff" strokeWidth={2.5} />}
                  <Text style={s.ctaText}>{loading ? "Validating…" : "Validate Token"}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP: OTP ──────────────────────────── */}
            {step === "otp" && (
              <>
                <View style={s.infoBox}>
                  <Mail size={16} color={C.forestMid} strokeWidth={2} />
                  <Text style={s.infoBoxText}>OTP sent to <Text style={{ fontWeight: "700", color: C.forest }}>{maskedEmail}</Text></Text>
                </View>

                <Text style={[s.fieldLabel, { textAlign: "center", marginBottom: 16 }]}>
                  One-Time Passcode
                </Text>

                <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 14, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => sendOtp()} disabled={loading} style={s.resendBtn}>
                    <Send size={13} color={C.forestMid} strokeWidth={2} />
                    <Text style={s.resendText}>{loading ? "Sending…" : "Resend OTP"}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[s.cta, { marginTop: 8 }, loading && { opacity: 0.75 }]}
                  onPress={verifyOtp} disabled={loading} activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <KeyRound size={20} color="#fff" strokeWidth={2.5} />}
                  <Text style={s.ctaText}>{loading ? "Verifying…" : "Verify OTP"}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP: Password ─────────────────────── */}
            {step === "password" && (
              <>
                <View style={s.infoBox}>
                  <CheckCircle size={16} color={C.success} strokeWidth={2} />
                  <Text style={s.infoBoxText}>OTP verified! Set a strong password.</Text>
                </View>

                <Field
                  label="New Password"
                  icon={Lock}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secure
                  hint="Use a mix of letters, numbers and symbols"
                />
                <Field
                  label="Confirm Password"
                  icon={Lock}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secure
                />

                {/* Password match indicator */}
                {confirmPassword.length > 0 && (
                  <View style={[s.matchRow, { backgroundColor: newPassword === confirmPassword ? "#DCFCE7" : "#FEE2E2" }]}>
                    {newPassword === confirmPassword
                      ? <><CheckCircle size={14} color={C.success} strokeWidth={2.5} /><Text style={{ fontSize: 12, color: C.success, fontWeight: "600" }}>Passwords match</Text></>
                      : <><Shield size={14} color={C.danger} strokeWidth={2.5} /><Text style={{ fontSize: 12, color: C.danger, fontWeight: "600" }}>Passwords do not match</Text></>
                    }
                  </View>
                )}

                <TouchableOpacity
                  style={[s.cta, loading && { opacity: 0.75 }]}
                  onPress={setPassword} disabled={loading} activeOpacity={0.85}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <CheckCircle size={20} color="#fff" strokeWidth={2.5} />}
                  <Text style={s.ctaText}>{loading ? "Activating…" : "Set Password & Activate"}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP: Done ─────────────────────────── */}
            {step === "done" && (
              <View style={s.doneWrap}>
                <View style={s.doneCircle}>
                  <CheckCircle size={52} color={C.success} strokeWidth={1.8} />
                </View>
                <Text style={s.doneTitle}>Account Activated!</Text>
                <Text style={s.doneSub}>
                  Your faculty account is now active. You can sign in using your email and the password you just set.
                </Text>
                <TouchableOpacity style={s.cta} onPress={() => router.replace("/faculty-login")} activeOpacity={0.85}>
                  <Text style={s.ctaText}>Go to Sign In</Text>
                  <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )}

            {/* Gold strip */}
            <View style={s.goldStrip} />

            <Text style={s.footerNote}>
              Vikasana Foundation · AICTE Approved · VTU Affiliated
            </Text>

            {step !== "done" && (
              <TouchableOpacity onPress={() => router.replace("/faculty-login")} style={{ alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: C.muted }}>
                  Already activated? <Text style={{ color: C.forestMid, fontWeight: "700" }}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Bottom bar */}
          <View style={s.bottomBar}>
            <View style={s.wave1} /><View style={s.wave2} /><View style={s.wave3} />
            <Text style={s.bottomText}>Empowering Communities Through Education</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bgDeep },

  // Header — identical to FacultyLogin
  header: { backgroundColor: C.bgDeep, paddingBottom: 0, overflow: "hidden", position: "relative" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  backBtn:{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  orgBadge:{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  orgText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },

  headerGraphic: { width: "100%", height: 160, backgroundColor: C.forest, overflow: "hidden", position: "relative", justifyContent: "center", alignItems: "center" },
  gridWrap: { position: "absolute", flexDirection: "row", flexWrap: "wrap", width: "100%", height: "100%", padding: 12, gap: 8 },
  gridCell: { width: 36, height: 36, borderRadius: 8 },
  shieldWrap: { justifyContent: "center", alignItems: "center" },
  shieldOuter:{ width: 90, height: 90, borderRadius: 24, backgroundColor: "rgba(59,111,212,0.3)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  shieldInner:{ width: 68, height: 68, borderRadius: 18, backgroundColor: C.forestMid, justifyContent: "center", alignItems: "center", shadowColor: C.forestLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },

  heroTextWrap:{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tag:    { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 6, borderWidth: 1, borderColor: "rgba(201,149,42,0.35)" },
  tagText:{ color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle: { fontSize: 32, fontWeight: "800", color: "#fff", lineHeight: 40, letterSpacing: -0.5 },
  heroSub:   { marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "500" },
  pullHandle:{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "center", marginTop: 20 },

  // Card — identical to FacultyLogin
  card: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -14, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8, flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.forest, justifyContent: "center", alignItems: "center", shadowColor: C.forest, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  cardTitle: { fontSize: 20, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  cardSub:   { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: "500" },

  // Step indicator
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 28, paddingHorizontal: 4 },
  stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  stepDot:  { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  stepDotActive: { backgroundColor: C.forest },
  stepNum:  { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLabel:{ fontSize: 10, color: C.muted, marginLeft: 5, fontWeight: "500" },
  stepLabelActive: { color: C.forest, fontWeight: "700" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#E5E7EB", marginHorizontal: 4, borderRadius: 1 },
  stepLineActive: { backgroundColor: C.forest },

  // Fields
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.forest, marginBottom: 8, letterSpacing: 0.2, textTransform: "uppercase"},
  fieldWrap:  { flexDirection: "row", alignItems: "center", backgroundColor: C.sageLight, borderRadius: 14, borderWidth: 1.5, borderColor: C.sage, paddingHorizontal: 14, paddingVertical: 4, gap: 10 },
  fieldWrapActive: { borderColor: C.forestMid, backgroundColor: C.white },
  fieldInput: { flex: 1, paddingVertical: Platform.OS === "android" ? 12 : 14, fontSize: 14, color: C.ink },
  fieldHint:  { marginTop: 5, fontSize: 11, color: C.muted, fontStyle: "italic", paddingLeft: 2 },

  // Info box
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.sageLight, borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.sage },
  infoBoxText: { fontSize: 13, color: C.muted, flex: 1, lineHeight: 18 },

  // Resend
  resendBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  resendText:{ fontSize: 13, color: C.forestMid, fontWeight: "600", textDecorationLine: "underline" },

  // Password match
  matchRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },

  // Done state
  doneWrap:   { alignItems: "center", paddingVertical: 12 },
  doneCircle: { width: 100, height: 100, borderRadius: 28, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  doneTitle:  { fontSize: 24, fontWeight: "800", color: C.ink, marginBottom: 10 },
  doneSub:    { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 21, marginBottom: 24, paddingHorizontal: 8 },

  // CTA
  cta:    { backgroundColor: C.forest, paddingVertical: 17, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.forest, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.30, shadowRadius: 12, elevation: 6, marginBottom: 24 },
  ctaText:{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },

  // Gold strip + footer
  goldStrip: { height: 3, borderRadius: 2, backgroundColor: C.gold, marginBottom: 16, opacity: 0.7 },
  footerNote:{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginBottom: 16, letterSpacing: 0.3 },

  // Bottom bar
  bottomBar: { height: 100, width: "100%", backgroundColor: C.bgDeep, overflow: "hidden", justifyContent: "flex-end", paddingBottom: 20, position: "relative" },
  wave1: { position: "absolute", top: -30, width: width * 1.4, height: 80, borderRadius: 100, backgroundColor: C.forestMid, opacity: 0.25, left: -width * 0.2 },
  wave2: { position: "absolute", top: -10, width: width * 1.2, height: 60, borderRadius: 80, backgroundColor: C.forestLight, opacity: 0.15, left: -width * 0.1 },
  wave3: { position: "absolute", top: 10, width: width, height: 50, borderRadius: 60, backgroundColor: C.gold, opacity: 0.06 },
  bottomText: { textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600", letterSpacing: 1.2, textTransform: "uppercase" },
});