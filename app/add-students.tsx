import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft, UserPlus, Upload, User, Hash, GitBranch,
  Calendar, Mail, CheckCircle, Shield, Sparkles,
  ChevronDown, FileText, AlertCircle, RefreshCw,
  BookOpen, Award, X, Check, Info,
} from "lucide-react-native";
import { API_BASE } from "@/constants/api";

const { width } = Dimensions.get("window");

// ─── Tokens ──────────────────────────────────────────────────
const C = {
  navy:        "#0B2D6B",
  navyMid:     "#1A47A0",
  navyLight:   "#3B6FD4",
  sage:        "#C7D8F5",
  sageLight:   "#EBF1FB",
  gold:        "#C9952A",
  white:       "#FFFFFF",
  ink:         "#0F172A",
  muted:       "#64748B",
  bg:          "#F0F4FC",
  success:     "#16A34A",
  error:       "#DC2626",
  warning:     "#D97706",
  surface:     "#FFFFFF",
  border:      "#E2E8F0",
};

type Scheme = "regular" | "diploma";
type Tab    = "manual" | "bulk";
type ToastType = "success" | "error" | "info";

const BRANCHES   = ["AI & ML", "CSE", "ECE", "ISE", "ME", "CE", "EEE", "MBA"];
const currentYear = new Date().getFullYear();
const YEARS       = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));

// ─── Toast ────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({
    msg: "", type: "info", visible: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type, visible: true });
    timer.current = setTimeout(() => setToast(p => ({ ...p, visible: false })), 3000);
  }, []);
  return { toast, show };
}

function Toast({ msg, type, visible }: { msg: string; type: ToastType; visible: boolean }) {
  const tY = useRef(new Animated.Value(-90)).current;
  const op = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
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

// ─── Dropdown Modal ───────────────────────────────────────────
function DropModal({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string; options: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={dm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={dm.sheet}>
          <View style={dm.handle} />
          <View style={dm.headerRow}>
            <Text style={dm.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={20} color={C.muted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity key={opt} style={[dm.opt, selected === opt && dm.optActive]} onPress={() => onSelect(opt)}>
                <Text style={[dm.optText, selected === opt && dm.optTextActive]}>{opt}</Text>
                {selected === opt && <Check size={16} color={C.navy} strokeWidth={2.5} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const dm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:        { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, maxHeight: "65%" },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  headerRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title:        { fontSize: 16, fontWeight: "800", color: C.ink },
  opt:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  optActive:    { backgroundColor: C.sageLight, marginHorizontal: -8, paddingHorizontal: 16, borderRadius: 10, borderBottomWidth: 0 },
  optText:      { fontSize: 15, color: C.ink, fontWeight: "500" },
  optTextActive:{ fontWeight: "700", color: C.navy },
});

// ─── Field ────────────────────────────────────────────────────
function Field({ label, icon: Icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, hint }: {
  label: string; icon: any; placeholder: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any;
  autoCapitalize?: any; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fi.group}>
      <Text style={fi.label}>{label}</Text>
      <View style={[fi.wrap, focused && fi.wrapFocused, value.length > 0 && !focused && fi.wrapFilled]}>
        <Icon size={17} color={focused ? C.navy : value.length > 0 ? C.navyMid : C.muted} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "words"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={fi.input}
        />
        {value.length > 0 && <CheckCircle size={15} color={C.navyLight} strokeWidth={2.5} />}
      </View>
      {hint && <Text style={fi.hint}>{hint}</Text>}
    </View>
  );
}
const fi = StyleSheet.create({
  group:      { marginBottom: 16 },
  label:      { fontSize: 12, fontWeight: "700", color: C.navy, marginBottom: 7, letterSpacing: 0.3, textTransform: "uppercase" },
  wrap:       { flexDirection: "row", alignItems: "center", backgroundColor: C.sageLight, borderRadius: 14, borderWidth: 1.5, borderColor: C.sage, paddingHorizontal: 14, paddingVertical: 4, gap: 10 },
  wrapFocused:{ borderColor: C.navyMid, backgroundColor: C.white },
  wrapFilled: { borderColor: C.sage, backgroundColor: C.white },
  input:      { flex: 1, fontSize: 15, color: C.ink, paddingVertical: Platform.OS === "android" ? 12 : 14 },
  hint:       { marginTop: 5, fontSize: 11, color: C.muted, fontStyle: "italic", paddingLeft: 2 },
});

// ─── Dropdown Field ───────────────────────────────────────────
function DropField({ label, icon: Icon, value, placeholder, onPress }: {
  label: string; icon: any; value: string; placeholder: string; onPress: () => void;
}) {
  return (
    <View style={fi.group}>
      <Text style={fi.label}>{label}</Text>
      <TouchableOpacity style={[fi.wrap, value && fi.wrapFilled]} onPress={onPress} activeOpacity={0.7}>
        <Icon size={17} color={value ? C.navyMid : C.muted} strokeWidth={2} />
        <Text style={[{ flex: 1, fontSize: 15, fontWeight: value ? "500" : "400" }, { color: value ? C.ink : "#94A3B8" }]}>
          {value || placeholder}
        </Text>
        <ChevronDown size={15} color={C.muted} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function AddStudents() {
  const [tab, setTab] = useState<Tab>("manual");
  const { toast, show } = useToast();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerDecor1} />
        <View style={s.headerDecor2} />
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.headerTitle}>Add Students</Text>
            <Text style={s.headerSub}>Enroll new students to your roster</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>AICTE</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={s.tabRow}>
          {([
            { key: "manual", label: "Manual Entry",  Icon: UserPlus },
            { key: "bulk",   label: "Bulk Upload",   Icon: Upload },
          ] as const).map(({ key, label, Icon }) => (
            <TouchableOpacity
              key={key}
              style={[s.tab, tab === key && s.tabActive]}
              onPress={() => setTab(key)}
            >
              <Icon size={15} color={tab === key ? C.white : "#8ab4d9"} strokeWidth={2.5} />
              <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === "manual"
        ? <ManualForm showToast={show} />
        : <BulkUpload showToast={show} />
      }
    </SafeAreaView>
  );
}

// ─── Manual Form ──────────────────────────────────────────────
function ManualForm({ showToast }: { showToast: (m: string, t: ToastType) => void }) {
  const [scheme,       setScheme]       = useState<Scheme | null>(null);
  const [name,         setName]         = useState("");
  const [usn,          setUsn]          = useState("");
  const [email,        setEmail]        = useState("");
  const [branch,       setBranch]       = useState("");
  const [passoutYear,  setPassoutYear]  = useState("");
  const [admittedYear, setAdmittedYear] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showBranch,   setShowBranch]   = useState(false);
  const [showPassout,  setShowPassout]  = useState(false);
  const [showAdmitted, setShowAdmitted] = useState(false);

  const reset = () => {
    setScheme(null); setName(""); setUsn(""); setEmail("");
    setBranch(""); setPassoutYear(""); setAdmittedYear("");
  };

  const onSubmit = async () => {
    if (!scheme)              { showToast("Please select an admission scheme", "error"); return; }
    if (!name.trim())         { showToast("Student name is required", "error"); return; }
    if (!usn.trim())          { showToast("USN is required", "error"); return; }
    if (!email.trim())        { showToast("Email address is required", "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast("Enter a valid email address", "error"); return; }
    if (!branch)              { showToast("Please select a branch", "error"); return; }
    if (!passoutYear)         { showToast("Passout year is required", "error"); return; }
    if (!admittedYear)        { showToast("Admitted year is required", "error"); return; }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const res = await fetch(`${API_BASE}/faculty/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          usn: usn.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          branch,
          passout_year:  parseInt(passoutYear),
          admitted_year: parseInt(admittedYear),
          scheme,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data?.detail || "Failed to add student", "error"); return; }
      showToast(`${name} enrolled successfully!`, "success");
      setTimeout(reset, 600);
    } catch {
      showToast("Network error — could not reach server", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Scheme cards */}
      <Text style={s.sectionLabel}>Admission Scheme</Text>
      <View style={s.schemeRow}>
        {([
          { key: "regular", label: "Regular",  sub: "4-year BE / B.Tech",  Icon: BookOpen },
          { key: "diploma", label: "Diploma",  sub: "Lateral / 3-year DTE", Icon: Award },
        ] as const).map(({ key, label, sub, Icon }) => (
          <TouchableOpacity
            key={key}
            style={[s.schemeCard, scheme === key && s.schemeCardActive]}
            onPress={() => setScheme(key)}
            activeOpacity={0.8}
          >
            <View style={[s.schemeIcon, scheme === key && s.schemeIconActive]}>
              <Icon size={20} color={scheme === key ? C.white : C.navyMid} strokeWidth={2} />
            </View>
            <Text style={[s.schemeLabel, scheme === key && { color: C.white }]}>{label}</Text>
            <Text style={[s.schemeSub, scheme === key && { color: "rgba(255,255,255,0.7)" }]}>{sub}</Text>
            {scheme === key && (
              <View style={s.schemeCheckBadge}>
                <Check size={12} color={C.navy} strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Fields */}
      <Field label="Full Name"       icon={User}      placeholder="e.g. Rahul Sharma"     value={name}  onChangeText={setName} />
      <Field label="USN"             icon={Hash}      placeholder="e.g. 1BG23AI001"       value={usn}   onChangeText={t => setUsn(t.toUpperCase())} autoCapitalize="characters" />
      <Field label="Email Address"   icon={Mail}      placeholder="student@college.edu"   value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" hint="A welcome email with app download link will be sent here" />

      <DropField label="Branch" icon={GitBranch} value={branch} placeholder="Select branch" onPress={() => setShowBranch(true)} />
      <DropModal visible={showBranch} title="Select Branch" options={BRANCHES} selected={branch}
        onSelect={v => { setBranch(v); setShowBranch(false); }} onClose={() => setShowBranch(false)} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <DropField label="Admitted Year" icon={Calendar} value={admittedYear} placeholder="Year" onPress={() => setShowAdmitted(true)} />
          <DropModal visible={showAdmitted} title="Admitted Year" options={YEARS} selected={admittedYear}
            onSelect={v => { setAdmittedYear(v); setShowAdmitted(false); }} onClose={() => setShowAdmitted(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <DropField label="Passout Year" icon={Calendar} value={passoutYear} placeholder="Year" onPress={() => setShowPassout(true)} />
          <DropModal visible={showPassout} title="Passout Year" options={YEARS} selected={passoutYear}
            onSelect={v => { setPassoutYear(v); setShowPassout(false); }} onClose={() => setShowPassout(false)} />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[s.cta, loading && { opacity: 0.75 }]}
        onPress={onSubmit} disabled={loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <UserPlus size={20} color="#fff" strokeWidth={2.5} />}
        <Text style={s.ctaText}>{loading ? "Enrolling…" : "Enroll Student"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.resetBtn} onPress={reset}>
        <RefreshCw size={14} color={C.muted} strokeWidth={2} />
        <Text style={s.resetText}>Clear Form</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Bulk Upload ──────────────────────────────────────────────
function BulkUpload({ showToast }: { showToast: (m: string, t: ToastType) => void }) {
  const [file,      setFile]      = useState<{ name: string; uri: string } | null>(null);
  const [skipDupes, setSkipDupes] = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<any>(null);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "text/csv", copyToCacheDirectory: true });
      if (res.canceled) return;
      setFile({ name: res.assets[0].name, uri: res.assets[0].uri });
      setResult(null);
    } catch { showToast("Unable to pick file", "error"); }
  };

  const onUpload = async () => {
    if (!file) { showToast("Please select a CSV file first", "error"); return; }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const fd = new FormData();
      fd.append("file", { uri: file.uri, name: file.name, type: "text/csv" } as any);
      const res = await fetch(`${API_BASE}/faculty/students/bulk-upload?skip_duplicates=${skipDupes}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data?.detail || "Upload failed", "error"); return; }
      setResult(data);
      showToast(`${data.inserted} students enrolled!`, "success");
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Format info */}
      <View style={s.infoCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Info size={16} color={C.navyMid} strokeWidth={2} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.navy }}>Required CSV Columns</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {["name", "usn", "email", "branch", "passout_year", "admitted_year"].map(h => (
            <View key={h} style={s.pill}>
              <Text style={s.pillText}>{h}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* File picker */}
      <Text style={s.sectionLabel}>CSV File</Text>
      <TouchableOpacity style={s.filePicker} onPress={pickFile} activeOpacity={0.75}>
        <View style={s.fileIcon}>
          <FileText size={26} color={C.navyMid} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: file ? "700" : "500", color: file ? C.ink : C.muted }} numberOfLines={1}>
            {file ? file.name : "Tap to browse CSV file"}
          </Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
            {file ? "Tap to change file" : "Only .csv files accepted"}
          </Text>
        </View>
        <Upload size={18} color={C.muted} strokeWidth={2} />
      </TouchableOpacity>

      {/* Skip dupes toggle */}
      <TouchableOpacity style={s.toggleRow} onPress={() => setSkipDupes(v => !v)} activeOpacity={0.8}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>Skip Duplicate USNs</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Existing entries will be ignored</Text>
        </View>
        <View style={[s.toggle, skipDupes && s.toggleOn]}>
          <View style={[s.toggleThumb, skipDupes && s.toggleThumbOn]} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.cta, (!file || loading) && { opacity: 0.55 }]}
        onPress={onUpload} disabled={!file || loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Upload size={20} color="#fff" strokeWidth={2.5} />}
        <Text style={s.ctaText}>{loading ? "Uploading…" : "Upload & Enroll"}</Text>
      </TouchableOpacity>

      {result && (
        <View style={s.resultCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <CheckCircle size={20} color={C.success} strokeWidth={2.5} />
            <Text style={{ fontSize: 16, fontWeight: "800", color: C.ink }}>Upload Complete</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[
              { label: "Total",    value: result.total_rows,          color: C.navy },
              { label: "Enrolled", value: result.inserted,            color: C.success },
              { label: "Skipped",  value: result.skipped_duplicates,  color: C.warning },
              { label: "Invalid",  value: result.invalid_rows,        color: C.error },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color }}>{value ?? 0}</Text>
                <Text style={{ fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 3 }}>{label}</Text>
              </View>
            ))}
          </View>
          {result.errors?.length > 0 && (
            <View style={{ marginTop: 14, backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FECACA" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.error, marginBottom: 6 }}>Errors</Text>
              {result.errors.slice(0, 5).map((e: string, i: number) => (
                <Text key={i} style={{ fontSize: 12, color: "#B91C1C", marginBottom: 3 }}>• {e}</Text>
              ))}
              {result.errors.length > 5 && (
                <Text style={{ fontSize: 11, color: C.muted, fontStyle: "italic", marginTop: 4 }}>…and {result.errors.length - 5} more</Text>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    backgroundColor: C.navy, paddingBottom: 0, overflow: "hidden",
  },
  headerDecor1: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.navyLight, opacity: 0.12 },
  headerDecor2: { position: "absolute", top: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: C.gold, opacity: 0.10 },
  navRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: C.white, fontSize: 18, fontWeight: "800" },
  headerSub:   { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,149,42,0.4)" },
  headerBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  tabRow: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  tab:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  tabActive:   { backgroundColor: C.navyMid },
  tabText:     { color: "#8ab4d9", fontWeight: "700", fontSize: 13 },
  tabTextActive:{ color: C.white },

  scroll: { padding: 20, paddingBottom: 60 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: C.navy, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },

  schemeRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  schemeCard: { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: C.border, position: "relative" },
  schemeCardActive: { backgroundColor: C.navy, borderColor: C.navy },
  schemeIcon:       { width: 38, height: 38, borderRadius: 10, backgroundColor: C.sageLight, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  schemeIconActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  schemeLabel:      { fontSize: 13, fontWeight: "800", color: C.ink, marginBottom: 3 },
  schemeSub:        { fontSize: 11, color: C.muted, lineHeight: 15 },
  schemeCheckBadge: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: C.gold, justifyContent: "center", alignItems: "center" },

  cta: { backgroundColor: C.navy, paddingVertical: 17, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6, marginTop: 8, marginBottom: 12 },
  ctaText:  { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  resetBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  resetText:{ color: C.muted, fontSize: 14, fontWeight: "600" },

  infoCard: { backgroundColor: C.sageLight, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: C.sage },
  pill:     { backgroundColor: C.navy, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: C.white, fontSize: 11, fontWeight: "700" },

  filePicker: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed", borderRadius: 14, padding: 16, gap: 14, marginBottom: 14 },
  fileIcon:   { width: 50, height: 50, borderRadius: 12, backgroundColor: C.sageLight, justifyContent: "center", alignItems: "center" },

  toggleRow:     { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  toggle:        { width: 44, height: 24, borderRadius: 12, backgroundColor: C.border, justifyContent: "center", padding: 2 },
  toggleOn:      { backgroundColor: C.success },
  toggleThumb:   { width: 20, height: 20, borderRadius: 10, backgroundColor: C.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleThumbOn: { alignSelf: "flex-end" },

  resultCard: { marginTop: 8, backgroundColor: C.white, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border },
});