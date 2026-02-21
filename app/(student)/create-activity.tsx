import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft, Camera, FileText, Tag, AlignLeft,
  CheckCircle, Image as ImageIcon, Shield, Sparkles,
  Send, X, Info, Upload,
} from "lucide-react-native";

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  navy:      "#0B2D6B",
  navyMid:   "#1A47A0",
  navyLight: "#3B6FD4",
  sage:      "#C7D8F5",
  sageLight: "#EBF1FB",
  gold:      "#C9952A",
  white:     "#FFFFFF",
  ink:       "#0F172A",
  muted:     "#64748B",
  bg:        "#F0F4FC",
  success:   "#16A34A",
  error:     "#DC2626",
  warning:   "#D97706",
  border:    "#E2E8F0",
};

type ToastType = "success" | "error" | "info";

// ─── Activity types ───────────────────────────────────────────
const ACTIVITY_TYPES = [
  "Cleaning Drive", "Tree Plantation", "Blood Donation",
  "Teaching/Tutoring", "Old Age Home Visit", "Orphanage Visit",
  "Flood Relief", "Awareness Campaign", "Other",
];

// ─── Toast ────────────────────────────────────────────────────
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
  const bg = { success: C.success, error: C.error, info: C.navy }[type];
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

// ─── Field component ──────────────────────────────────────────
function Field({ label, icon: Icon, placeholder, value, onChangeText, multiline, keyboardType, hint }: {
  label: string; icon: any; placeholder: string; value: string;
  onChangeText: (t: string) => void; multiline?: boolean;
  keyboardType?: any; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldWrap, focused && s.fieldWrapActive, multiline && { alignItems: "flex-start", paddingTop: 4 }]}>
        <Icon size={17} color={focused ? C.navy : value.length > 0 ? C.navyMid : C.muted} strokeWidth={2}
          style={multiline ? { marginTop: 10 } : {}} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.fieldInput, multiline && { minHeight: 100, textAlignVertical: "top", paddingTop: 10 }]}
        />
        {!multiline && value.length > 0 && (
          <CheckCircle size={15} color={C.navyLight} strokeWidth={2.5} />
        )}
      </View>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
    </View>
  );
}

// ─── Dot strip ────────────────────────────────────────────────
function DotStrip() {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: i % 3 === 0 ? C.gold : C.sage, opacity: 0.6 }} />
      ))}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function CreateActivity() {
  const [activityName, setActivityName] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description,  setDescription]  = useState("");
  const [photoCount,   setPhotoCount]   = useState(0);
  const { toast, show } = useToast();

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const cardSlide  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(headerAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
        Animated.timing(cardAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleOpenCamera = () => {
    router.push("/(student)/activity-camera");
  };

  const handleSubmit = () => {
    if (!activityName.trim()) { show("Activity name is required", "error"); return; }
    if (!activityType.trim()) { show("Activity type is required", "error"); return; }
    if (photoCount < 3)       { show(`${3 - photoCount} more photo(s) required`, "error"); return; }
    show("Activity submitted successfully!", "success");
    setTimeout(() => {
      setActivityName(""); setActivityType(""); setDescription(""); setPhotoCount(0);
      router.back();
    }, 1200);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />

      {/* ── Header ──────────────────────────────────── */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <View style={s.headerDecor1} />
        <View style={s.headerDecor2} />

        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.headerTitle}>Create Activity</Text>
            <Text style={s.headerSub}>Submit a new social activity for verification</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>AICTE</Text>
          </View>
        </View>

        {/* Step progress strip */}
        <View style={s.progressStrip}>
          {[
            { label: "Details",  done: !!(activityName && activityType) },
            { label: "Photos",   done: photoCount >= 3 },
            { label: "Submit",   done: false },
          ].map(({ label, done }, i, arr) => (
            <React.Fragment key={label}>
              <View style={s.stepItem}>
                <View style={[s.stepDot, done && s.stepDotDone]}>
                  {done
                    ? <CheckCircle size={12} color={C.white} strokeWidth={2.5} />
                    : <Text style={s.stepNum}>{i + 1}</Text>
                  }
                </View>
                <Text style={[s.stepLabel, done && { color: C.gold }]}>{label}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[s.stepLine, done && s.stepLineDone]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </Animated.View>

      {/* ── Card ────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[s.card, { opacity: cardAnim, transform: [{ translateY: cardSlide }] }]}>

          {/* Card header */}
          <View style={s.cardHeader}>
            <View style={s.cardIconCircle}>
              <FileText size={22} color={C.white} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Activity Details</Text>
              <Text style={s.cardSub}>Fill in all required fields</Text>
            </View>
          </View>

          <DotStrip />

          {/* Fields */}
          <Field
            label="Activity Name *"
            icon={Tag}
            placeholder="e.g. Tree Plantation Drive"
            value={activityName}
            onChangeText={setActivityName}
          />

          {/* Activity type — chip selector */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Activity Type *</Text>
            <View style={s.typeGrid}>
              {ACTIVITY_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[s.typeChip, activityType === type && s.typeChipActive]}
                  onPress={() => setActivityType(type)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.typeChipText, activityType === type && s.typeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Field
            label="Description"
            icon={AlignLeft}
            placeholder="Describe what you did, where, and the impact it made…"
            value={description}
            onChangeText={setDescription}
            multiline
            hint="Be descriptive — it helps faculty verify faster"
          />

          {/* Gold divider */}
          <View style={s.goldDivider} />

          {/* Photo section */}
          <View style={s.fieldGroup}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={s.fieldLabel}>Photos *</Text>
              <View style={[s.photoCountBadge, { backgroundColor: photoCount >= 3 ? "#DCFCE7" : "#FEF3C7" }]}>
                <Text style={[s.photoCountText, { color: photoCount >= 3 ? C.success : C.warning }]}>
                  {photoCount}/5 photos
                </Text>
              </View>
            </View>

            {/* Info row */}
            <View style={s.infoRow}>
              <Info size={14} color={C.navyMid} strokeWidth={2} />
              <Text style={s.infoText}>Minimum 3, maximum 5 photos required. GPS location is auto-stamped.</Text>
            </View>

            {/* Photo progress bar */}
            <View style={s.photoProg}>
              <View style={[s.photoProgFill, {
                width: `${Math.min((photoCount / 5) * 100, 100)}%`,
                backgroundColor: photoCount >= 3 ? C.success : C.warning,
              }]} />
            </View>

            {/* Camera CTA */}
            <TouchableOpacity style={s.cameraCta} onPress={handleOpenCamera} activeOpacity={0.85}>
              <View style={s.cameraCtaIcon}>
                <Camera size={22} color={C.white} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cameraCtaTitle}>Open GPS Camera</Text>
                <Text style={s.cameraCtaSub}>Auto-stamps location & timestamp</Text>
              </View>
              <View style={s.cameraCtaBadge}>
                <Text style={s.cameraCtaBadgeText}>{photoCount}/5</Text>
              </View>
            </TouchableOpacity>

            {/* Photo slots preview */}
            <View style={s.photoSlots}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[s.photoSlot, i < photoCount && s.photoSlotFilled]}>
                  {i < photoCount
                    ? <CheckCircle size={18} color={C.success} strokeWidth={2.5} />
                    : <ImageIcon size={18} color={C.muted} strokeWidth={1.5} />
                  }
                  <Text style={[s.photoSlotText, i < photoCount && { color: C.success }]}>
                    {i < photoCount ? "Done" : `Photo ${i + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Gold strip */}
          <View style={s.goldStrip} />

          {/* Submit */}
          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Send size={20} color={C.white} strokeWidth={2.5} />
            <Text style={s.submitText}>Submit Activity</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.clearBtn} onPress={() => {
            setActivityName(""); setActivityType(""); setDescription(""); setPhotoCount(0);
          }}>
            <X size={14} color={C.muted} strokeWidth={2} />
            <Text style={s.clearBtnText}>Clear Form</Text>
          </TouchableOpacity>

          <Text style={s.footerNote}>Vikasana Foundation · AICTE Approved · VTU Affiliated</Text>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },

  // Header
  header: {
    backgroundColor: C.navy, paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 20, overflow: "hidden",
  },
  headerDecor1: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.navyLight, opacity: 0.10 },
  headerDecor2: { position: "absolute", bottom: -10, right: 60, width: 70, height: 70, borderRadius: 35, backgroundColor: C.gold, opacity: 0.08 },
  navRow:    { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: "800" },
  headerSub:   { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,149,42,0.4)" },
  headerBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  // Step progress
  progressStrip: { flexDirection: "row", alignItems: "center" },
  stepItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
  stepDot:   { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  stepDotDone: { backgroundColor: C.navyMid },
  stepNum:   { fontSize: 11, fontWeight: "700", color: C.white },
  stepLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  stepLine:  { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6, borderRadius: 1 },
  stepLineDone: { backgroundColor: C.navyMid },

  // Card
  card: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -14, paddingTop: 28, paddingHorizontal: 22, paddingBottom: 8,
    flex: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  cardHeader:    { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  cardIconCircle:{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.navy, justifyContent: "center", alignItems: "center", shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  cardTitle:     { fontSize: 20, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  cardSub:       { fontSize: 12, color: C.muted, marginTop: 2 },

  // Fields
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: C.navy, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  fieldWrap:  { flexDirection: "row", alignItems: "center", backgroundColor: C.sageLight, borderRadius: 14, borderWidth: 1.5, borderColor: C.sage, paddingHorizontal: 14, paddingVertical: 4, gap: 10 },
  fieldWrapActive: { borderColor: C.navyMid, backgroundColor: C.white },
  fieldInput: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: Platform.OS === "android" ? 12 : 14 },
  fieldHint:  { marginTop: 5, fontSize: 11, color: C.muted, fontStyle: "italic", paddingLeft: 2 },

  // Activity type chips
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.sageLight, borderWidth: 1.5, borderColor: C.sage },
  typeChipActive:   { backgroundColor: C.navy, borderColor: C.navy },
  typeChipText:     { fontSize: 12, fontWeight: "600", color: C.muted },
  typeChipTextActive:{ color: C.white, fontWeight: "700" },

  // Dividers
  goldDivider: { height: 1, backgroundColor: C.gold, opacity: 0.3, marginBottom: 20 },
  goldStrip:   { height: 3, borderRadius: 2, backgroundColor: C.gold, opacity: 0.65, marginBottom: 20 },

  // Photo section
  photoCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  photoCountText:  { fontSize: 12, fontWeight: "700" },
  infoRow:    { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.sageLight, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: C.sage },
  infoText:   { flex: 1, fontSize: 12, color: C.muted, lineHeight: 17 },
  photoProg:  { height: 5, backgroundColor: C.sageLight, borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  photoProgFill: { height: "100%", borderRadius: 3 },

  cameraCta: {
    backgroundColor: C.navy, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5, marginBottom: 14,
  },
  cameraCtaIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  cameraCtaTitle:   { color: C.white, fontSize: 15, fontWeight: "700" },
  cameraCtaSub:     { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
  cameraCtaBadge:   { backgroundColor: "rgba(201,149,42,0.25)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,149,42,0.4)" },
  cameraCtaBadgeText:{ color: C.gold, fontSize: 13, fontWeight: "800" },

  photoSlots: { flexDirection: "row", gap: 8 },
  photoSlot:  { flex: 1, backgroundColor: C.sageLight, borderRadius: 10, paddingVertical: 12, alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: C.sage, borderStyle: "dashed" },
  photoSlotFilled: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC", borderStyle: "solid" },
  photoSlotText:   { fontSize: 9, fontWeight: "600", color: C.muted },

  // Submit
  submitBtn: {
    backgroundColor: C.navy, paddingVertical: 17, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 6, marginBottom: 12,
  },
  submitText: { color: C.white, fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  clearBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, marginBottom: 16 },
  clearBtnText:{ color: C.muted, fontSize: 14, fontWeight: "600" },
  footerNote: { textAlign: "center", fontSize: 11, color: "#9CA3AF", marginBottom: 8, letterSpacing: 0.3 },
});