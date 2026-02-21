import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_BASE } from "@/constants/api";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bgDeep:       "#0a1628",
  accent:       "#1565c0",
  accentBright: "#1e88e5",
  surface:      "#ffffff",
  surfaceAlt:   "#f4f7fc",
  border:       "#dce6f5",
  text:         "#0a1628",
  textMuted:    "#5a7099",
  textLight:    "#ffffff",
  success:      "#22c55e",
  error:        "#ef4444",
  warning:      "#f59e0b",
};

// ── Scheme config ─────────────────────────────────────────────────────────────
type Scheme = "regular" | "diploma";

const SCHEMES: { key: Scheme; label: string; desc: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "regular",  label: "Regular Scheme",  desc: "4-year BE/BTech program",    icon: "school-outline" },
  { key: "diploma",  label: "Diploma Scheme",  desc: "Lateral entry / 3-year DTE", icon: "ribbon-outline" },
];

// Year range helpers
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));

// ── Branch options ────────────────────────────────────────────────────────────
const BRANCHES = ["AI", "CSE", "ECE", "ISE", "ME", "CE", "EEE", "MBA"];

// ── Main Screen ───────────────────────────────────────────────────────────────
type Tab = "manual" | "bulk";

export default function AddStudents() {
  const [activeTab, setActiveTab] = useState<Tab>("manual");

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={C.textLight} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.headerTitle}>Add Students</Text>
          <Text style={styles.headerSub}>Manual entry or CSV bulk upload</Text>
        </View>
        <Ionicons name="people-outline" size={24} color="#8ab4d9" />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TabBtn label="Manual Entry"  icon="person-add-outline" active={activeTab === "manual"} onPress={() => setActiveTab("manual")} />
        <TabBtn label="Bulk Upload"   icon="cloud-upload-outline" active={activeTab === "bulk"}   onPress={() => setActiveTab("bulk")} />
      </View>

      {activeTab === "manual" ? <ManualForm /> : <BulkUpload />}
    </View>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({
  label, icon, active, onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={active ? C.textLight : C.textMuted} />
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ── Manual Form ───────────────────────────────────────────────────────────────
function ManualForm() {
  const [scheme, setScheme]               = useState<Scheme | null>(null);
  const [name, setName]                   = useState("");
  const [usn, setUsn]                     = useState("");
  const [branch, setBranch]               = useState("");
  const [passoutYear, setPassoutYear]     = useState("");
  const [admittedYear, setAdmittedYear]   = useState("");
  const [loading, setLoading]             = useState(false);
  const [focused, setFocused]             = useState<string | null>(null);

  // Dropdown states
  const [showBranchDrop, setShowBranchDrop]       = useState(false);
  const [showPassoutDrop, setShowPassoutDrop]      = useState(false);
  const [showAdmittedDrop, setShowAdmittedDrop]   = useState(false);

  const reset = () => {
    setScheme(null); setName(""); setUsn(""); setBranch("");
    setPassoutYear(""); setAdmittedYear("");
  };

  const onSubmit = async () => {
    if (!scheme)        { Alert.alert("Required", "Please select a scheme"); return; }
    if (!name.trim())   { Alert.alert("Required", "Student name is required"); return; }
    if (!usn.trim())    { Alert.alert("Required", "USN is required"); return; }
    if (!branch)        { Alert.alert("Required", "Branch is required"); return; }
    if (!passoutYear)   { Alert.alert("Required", "Passout year is required"); return; }
    if (!admittedYear)  { Alert.alert("Required", "Admitted year is required"); return; }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const res = await fetch(`${API_BASE}/faculty/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          usn: usn.trim().toUpperCase(),
          branch,
          passout_year: parseInt(passoutYear),
          admitted_year: parseInt(admittedYear),
          scheme,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data?.detail || "Failed to add student");
        return;
      }

      Alert.alert("Success", `${name} added successfully!`, [
        { text: "Add Another", onPress: reset },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Network Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.formScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Scheme picker */}
      <Text style={styles.fieldLabel}>Admission Scheme</Text>
      <View style={styles.schemeRow}>
        {SCHEMES.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.schemeCard, scheme === s.key && styles.schemeCardActive]}
            onPress={() => setScheme(s.key)}
          >
            <View style={[styles.schemeIconBox, scheme === s.key && styles.schemeIconBoxActive]}>
              <Ionicons name={s.icon} size={20} color={scheme === s.key ? C.textLight : C.accentBright} />
            </View>
            <Text style={[styles.schemeLabel, scheme === s.key && styles.schemeLabelActive]}>
              {s.label}
            </Text>
            <Text style={[styles.schemeDesc, scheme === s.key && { color: "#a8c8f0" }]}>
              {s.desc}
            </Text>
            {scheme === s.key && (
              <View style={styles.schemeCheck}>
                <Ionicons name="checkmark-circle" size={18} color={C.textLight} />
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Name */}
      <FieldInput
        label="Full Name"
        icon="person-outline"
        placeholder="e.g. Rahul Sharma"
        value={name}
        onChangeText={setName}
        focused={focused === "name"}
        onFocus={() => setFocused("name")}
        onBlur={() => setFocused(null)}
      />

      {/* USN */}
      <FieldInput
        label="USN"
        icon="card-outline"
        placeholder="e.g. 1BG23AI001"
        value={usn}
        onChangeText={(t) => setUsn(t.toUpperCase())}
        focused={focused === "usn"}
        onFocus={() => setFocused("usn")}
        onBlur={() => setFocused(null)}
        autoCapitalize="characters"
      />

      {/* Branch dropdown */}
      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Branch</Text>
      <Pressable
        style={[styles.dropdownBtn, showBranchDrop && styles.dropdownBtnFocused]}
        onPress={() => setShowBranchDrop(true)}
      >
        <Ionicons name="git-branch-outline" size={18} color={C.accentBright} />
        <Text style={[styles.dropdownBtnText, !branch && { color: C.textMuted }]}>
          {branch || "Select branch"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textMuted} />
      </Pressable>
      <DropdownModal
        visible={showBranchDrop}
        title="Select Branch"
        options={BRANCHES}
        selected={branch}
        onSelect={(v) => { setBranch(v); setShowBranchDrop(false); }}
        onClose={() => setShowBranchDrop(false)}
      />

      {/* Year row */}
      <View style={styles.yearRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Admitted Year</Text>
          <Pressable
            style={[styles.dropdownBtn, showAdmittedDrop && styles.dropdownBtnFocused]}
            onPress={() => setShowAdmittedDrop(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={C.accentBright} />
            <Text style={[styles.dropdownBtnText, !admittedYear && { color: C.textMuted }]}>
              {admittedYear || "Year"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </Pressable>
          <DropdownModal
            visible={showAdmittedDrop}
            title="Admitted Year"
            options={YEARS}
            selected={admittedYear}
            onSelect={(v) => { setAdmittedYear(v); setShowAdmittedDrop(false); }}
            onClose={() => setShowAdmittedDrop(false)}
          />
        </View>

        <View style={{ width: 12 }} />

        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Passout Year</Text>
          <Pressable
            style={[styles.dropdownBtn, showPassoutDrop && styles.dropdownBtnFocused]}
            onPress={() => setShowPassoutDrop(true)}
          >
            <Ionicons name="flag-outline" size={18} color={C.accentBright} />
            <Text style={[styles.dropdownBtnText, !passoutYear && { color: C.textMuted }]}>
              {passoutYear || "Year"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textMuted} />
          </Pressable>
          <DropdownModal
            visible={showPassoutDrop}
            title="Passout Year"
            options={YEARS}
            selected={passoutYear}
            onSelect={(v) => { setPassoutYear(v); setShowPassoutDrop(false); }}
            onClose={() => setShowPassoutDrop(false)}
          />
        </View>
      </View>

      {/* Submit */}
      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.88 }, loading && { opacity: 0.7 }]}
      >
        {loading ? (
          <ActivityIndicator color={C.textLight} />
        ) : (
          <>
            <Ionicons name="person-add-outline" size={18} color={C.textLight} />
            <Text style={styles.submitBtnText}>Add Student</Text>
          </>
        )}
      </Pressable>

      {/* Reset */}
      <Pressable onPress={reset} style={styles.resetBtn}>
        <Ionicons name="refresh-outline" size={16} color={C.textMuted} />
        <Text style={styles.resetBtnText}>Clear Form</Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Bulk Upload ───────────────────────────────────────────────────────────────
function BulkUpload() {
  const [file, setFile]           = useState<{ name: string; uri: string; type: string } | null>(null);
  const [skipDupes, setSkipDupes] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<any>(null);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const asset = res.assets[0];
      setFile({ name: asset.name, uri: asset.uri, type: "text/csv" });
      setResult(null);
    } catch {
      Alert.alert("Error", "Unable to pick file");
    }
  };

  const onUpload = async () => {
    if (!file) { Alert.alert("No file", "Please select a CSV file first"); return; }
    setLoading(true);
    setResult(null);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const formData = new FormData();
      formData.append("file", { uri: file.uri, name: file.name, type: "text/csv" } as any);

      const res = await fetch(
        `${API_BASE}/faculty/students/bulk-upload?skip_duplicates=${skipDupes}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Upload Failed", data?.detail || "Something went wrong");
        return;
      }
      setResult(data);
    } catch {
      Alert.alert("Network Error", "Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.formScroll}
      showsVerticalScrollIndicator={false}
    >
      {/* CSV format info */}
      <View style={styles.infoCard}>
        <View style={styles.infoCardHeader}>
          <Ionicons name="information-circle-outline" size={18} color={C.accentBright} />
          <Text style={styles.infoCardTitle}>Expected CSV Format</Text>
        </View>
        <Text style={styles.infoCardText}>
          Headers (in order):
        </Text>
        <View style={styles.csvHeaders}>
          {["name", "usn", "branch", "passout_year", "admitted_year"].map((h) => (
            <View key={h} style={styles.csvHeaderPill}>
              <Text style={styles.csvHeaderPillText}>{h}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* File picker */}
      <Text style={styles.fieldLabel}>Select CSV File</Text>
      <Pressable style={styles.filePicker} onPress={pickFile}>
        <View style={styles.filePickerIcon}>
          <Ionicons name="document-attach-outline" size={28} color={C.accentBright} />
        </View>
        {file ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.filePickerName} numberOfLines={1}>{file.name}</Text>
            <Text style={styles.filePickerSub}>Tap to change file</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.filePickerPrompt}>Tap to browse CSV file</Text>
            <Text style={styles.filePickerSub}>Only .csv files accepted</Text>
          </View>
        )}
        <Ionicons name="folder-open-outline" size={20} color={C.textMuted} />
      </Pressable>

      {/* Skip duplicates toggle */}
      <Pressable style={styles.toggleRow} onPress={() => setSkipDupes(!skipDupes)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>Skip Duplicate USNs</Text>
          <Text style={styles.toggleSub}>Existing USNs will be ignored instead of failing</Text>
        </View>
        <View style={[styles.toggle, skipDupes && styles.toggleOn]}>
          <View style={[styles.toggleThumb, skipDupes && styles.toggleThumbOn]} />
        </View>
      </Pressable>

      {/* Upload button */}
      <Pressable
        onPress={onUpload}
        disabled={loading || !file}
        style={({ pressed }) => [
          styles.submitBtn,
          pressed && { opacity: 0.88 },
          (loading || !file) && { opacity: 0.5 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={C.textLight} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color={C.textLight} />
            <Text style={styles.submitBtnText}>Upload & Process</Text>
          </>
        )}
      </Pressable>

      {/* Result card */}
      {result && <UploadResultCard result={result} />}
    </ScrollView>
  );
}

// ── Upload Result Card ────────────────────────────────────────────────────────
function UploadResultCard({ result }: { result: any }) {
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Ionicons name="checkmark-circle" size={20} color={C.success} />
        <Text style={styles.resultTitle}>Upload Complete</Text>
      </View>

      <View style={styles.resultGrid}>
        <ResultStat label="Total Rows"   value={result.total_rows}         color={C.accent} />
        <ResultStat label="Inserted"     value={result.inserted}            color={C.success} />
        <ResultStat label="Skipped"      value={result.skipped_duplicates}  color={C.warning} />
        <ResultStat label="Invalid"      value={result.invalid_rows}        color={C.error} />
      </View>

      {result.errors?.length > 0 && (
        <View style={styles.errorList}>
          <Text style={styles.errorListTitle}>
            <Ionicons name="warning-outline" size={13} color={C.error} /> Errors
          </Text>
          {result.errors.slice(0, 5).map((e: string, i: number) => (
            <Text key={i} style={styles.errorListItem}>• {e}</Text>
          ))}
          {result.errors.length > 5 && (
            <Text style={styles.errorListMore}>…and {result.errors.length - 5} more</Text>
          )}
        </View>
      )}
    </View>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.resultStat}>
      <Text style={[styles.resultStatValue, { color }]}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
    </View>
  );
}

// ── Dropdown Modal ────────────────────────────────────────────────────────────
function DropdownModal({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.modalOption, selected === opt && styles.modalOptionSelected]}
                onPress={() => onSelect(opt)}
              >
                <Text style={[styles.modalOptionText, selected === opt && styles.modalOptionTextSelected]}>
                  {opt}
                </Text>
                {selected === opt && (
                  <Ionicons name="checkmark" size={18} color={C.accent} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Field Input ───────────────────────────────────────────────────────────────
function FieldInput({
  label, icon, placeholder, value, onChangeText,
  focused, onFocus, onBlur, autoCapitalize, keyboardType,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: any;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <Ionicons name={icon} size={18} color={focused ? C.accentBright : C.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCapitalize={autoCapitalize ?? "words"}
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceAlt },

  header: {
    backgroundColor: C.bgDeep,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingBottom: 20,
  },
  headerTitle: { color: C.textLight, fontSize: 18, fontWeight: "800" },
  headerSub:   { color: "#7baad4", fontSize: 11, marginTop: 2 },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.bgDeep,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tabBtnActive:     { backgroundColor: C.accentBright },
  tabBtnText:       { color: C.textMuted, fontWeight: "700", fontSize: 13 },
  tabBtnTextActive: { color: C.textLight },

  formScroll: { padding: 20, paddingBottom: 48 },

  fieldLabel: { fontSize: 11, fontWeight: "800", color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },

  // Scheme picker
  schemeRow:           { flexDirection: "row", gap: 12, marginBottom: 4 },
  schemeCard:          { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: C.border },
  schemeCardActive:    { backgroundColor: C.accent, borderColor: C.accent },
  schemeIconBox:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "#e8f0fe", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  schemeIconBoxActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  schemeLabel:         { fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 4 },
  schemeLabelActive:   { color: C.textLight },
  schemeDesc:          { fontSize: 11, color: C.textMuted, lineHeight: 15 },
  schemeCheck:         { position: "absolute", top: 10, right: 10 },

  // Input
  inputWrap:    { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, gap: 10 },
  inputFocused: { borderColor: C.accentBright, backgroundColor: "#f0f6ff" },
  input:        { flex: 1, fontSize: 15, color: C.text, paddingVertical: Platform.OS === "android" ? 12 : 14 },

  // Dropdown
  dropdownBtn:        { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  dropdownBtnFocused: { borderColor: C.accentBright, backgroundColor: "#f0f6ff" },
  dropdownBtnText:    { flex: 1, fontSize: 15, color: C.text, fontWeight: "500" },

  yearRow: { flexDirection: "row", marginTop: 14 },

  // Submit
  submitBtn:     { marginTop: 24, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  submitBtnText: { color: C.textLight, fontSize: 16, fontWeight: "700" },
  resetBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, paddingVertical: 10 },
  resetBtnText:  { color: C.textMuted, fontSize: 14, fontWeight: "600" },

  // Info card
  infoCard:        { backgroundColor: "#e8f0fe", borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#c3d8f8" },
  infoCardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoCardTitle:   { fontSize: 13, fontWeight: "700", color: C.accent },
  infoCardText:    { fontSize: 12, color: C.textMuted, marginBottom: 8 },
  csvHeaders:      { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  csvHeaderPill:   { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  csvHeaderPillText:{ color: C.textLight, fontSize: 11, fontWeight: "700" },

  // File picker
  filePicker:       { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed", borderRadius: 14, padding: 16, gap: 14, marginBottom: 4 },
  filePickerIcon:   { width: 48, height: 48, borderRadius: 12, backgroundColor: "#e8f0fe", justifyContent: "center", alignItems: "center" },
  filePickerName:   { fontSize: 14, fontWeight: "700", color: C.text },
  filePickerPrompt: { fontSize: 14, fontWeight: "600", color: C.textMuted },
  filePickerSub:    { fontSize: 11, color: C.textMuted, marginTop: 3 },

  // Toggle
  toggleRow:   { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: C.border, gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: C.text },
  toggleSub:   { fontSize: 11, color: C.textMuted, marginTop: 2 },
  toggle:      { width: 44, height: 24, borderRadius: 12, backgroundColor: C.border, justifyContent: "center", padding: 2 },
  toggleOn:    { backgroundColor: C.success },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleThumbOn: { alignSelf: "flex-end" },

  // Result
  resultCard:       { marginTop: 20, backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  resultHeader:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  resultTitle:      { fontSize: 15, fontWeight: "800", color: C.text },
  resultGrid:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  resultStat:       { flex: 1, alignItems: "center" },
  resultStatValue:  { fontSize: 22, fontWeight: "800" },
  resultStatLabel:  { fontSize: 11, color: C.textMuted, fontWeight: "600", marginTop: 3 },
  errorList:        { backgroundColor: "#fff5f5", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#fecaca" },
  errorListTitle:   { fontSize: 12, fontWeight: "700", color: C.error, marginBottom: 6 },
  errorListItem:    { fontSize: 12, color: "#b91c1c", marginBottom: 3, lineHeight: 17 },
  errorListMore:    { fontSize: 11, color: C.textMuted, marginTop: 4, fontStyle: "italic" },

  // Modal
  modalOverlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet:            { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "60%", paddingBottom: 36 },
  modalHandle:           { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
  modalTitle:            { fontSize: 15, fontWeight: "800", color: C.text, marginBottom: 12 },
  modalOption:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  modalOptionSelected:   { backgroundColor: "#f0f6ff", marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 8 },
  modalOptionText:       { fontSize: 15, color: C.text, fontWeight: "500" },
  modalOptionTextSelected:{ fontWeight: "700", color: C.accent },
});