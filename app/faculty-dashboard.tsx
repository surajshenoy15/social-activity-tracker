import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, ActivityIndicator, TouchableOpacity, ScrollView,
  StyleSheet, Animated, StatusBar, Platform, TextInput,
  Modal, FlatList, Dimensions, RefreshControl,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  LogOut, Users, QrCode, Activity, LayoutDashboard,
  Search, ChevronRight, CheckCircle, Clock, XCircle,
  Mail, BookOpen, Calendar, Shield, Sparkles, X,
  UserPlus, RefreshCw, Award, TrendingUp, AlertCircle,
  Eye, Filter,
} from "lucide-react-native";
import { API_BASE } from "@/constants/api";

const { width } = Dimensions.get("window");

// ─── Tokens ──────────────────────────────────────────────────
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

type NavTab = "dashboard" | "students" | "scanner" | "activities";
type ToastType = "success" | "error" | "info";

// ─── Toast ────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: ToastType; visible: boolean }>({ msg: "", type: "info", visible: false });
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
  wrap: { position: "absolute", top: 60, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, zIndex: 999, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  text: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 },
});

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; Icon: any; label: string }> = {
    approved: { color: C.success,  bg: "#DCFCE7", Icon: CheckCircle,   label: "Approved"  },
    pending:  { color: C.warning,  bg: "#FEF3C7", Icon: Clock,         label: "Pending"   },
    rejected: { color: C.error,    bg: "#FEE2E2", Icon: XCircle,       label: "Rejected"  },
  };
  const c = cfg[status?.toLowerCase()] ?? cfg.pending;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
      <c.Icon size={12} color={c.color} strokeWidth={2.5} />
      <Text style={{ fontSize: 11, fontWeight: "700", color: c.color }}>{c.label}</Text>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────
export default function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [loading,   setLoading]   = useState(true);
  const [faculty,   setFaculty]   = useState<any>(null);
  const { toast, show } = useToast();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("faculty_token");
        if (!token) { router.replace("/faculty-login"); return; }
        const profileStr = await SecureStore.getItemAsync("faculty_profile");
        if (profileStr) {
          const p = JSON.parse(profileStr);
          setFaculty(p?.faculty ?? p);
        }
      } catch { show("Unable to load dashboard", "error"); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.spring(headerAnim, { toValue: 1, tension: 55, friction: 10, useNativeDriver: true }),
        Animated.spring(bodyAnim,   { toValue: 1, tension: 45, friction: 9,  useNativeDriver: true }),
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.navy} />
        <Text style={{ marginTop: 12, color: C.muted, fontSize: 14 }}>Loading Dashboard…</Text>
      </View>
    );
  }

  const name     = faculty?.full_name || faculty?.name || "Faculty";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":  return <DashboardTab faculty={faculty} initials={initials} showToast={show} />;
      case "students":   return <StudentsTab  showToast={show} />;
      case "scanner":    return <ScannerTab   showToast={show} />;
      case "activities": return <ActivitiesTab showToast={show} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />

      {/* Top header bar */}
      <Animated.View style={[
        styles.topBar,
        { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }
      ]}>
        <View style={styles.topBarDecor1} />
        <View style={styles.topBarDecor2} />
        <View style={styles.brandRow}>
          <View style={styles.logoBox}><Text style={styles.logoText}>V</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>Vikasana Foundation</Text>
            <Text style={styles.brandTagline}>EMPOWERING COMMUNITIES</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutIcon} hitSlop={12}>
            <LogOut size={18} color="#8ab4d9" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.profileRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeLabel}>Welcome back</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>{name}</Text>
            <Text style={styles.welcomeCollege}>{faculty?.college || "Faculty Member"}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>FACULTY</Text>
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[
        { flex: 1, backgroundColor: C.bg },
        { opacity: bodyAnim, transform: [{ translateY: bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }
      ]}>
        {renderContent()}
      </Animated.View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        {([
          { key: "dashboard",  label: "Home",      Icon: LayoutDashboard },
          { key: "students",   label: "Students",  Icon: Users },
          { key: "scanner",    label: "Scan QR",   Icon: QrCode },
          { key: "activities", label: "Activities", Icon: Activity },
        ] as const).map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.navItem, activeTab === key && styles.navItemActive]}
            onPress={() => setActiveTab(key)}
          >
            <View style={[styles.navIconWrap, activeTab === key && styles.navIconWrapActive]}>
              <Icon size={20} color={activeTab === key ? C.white : "#8ab4d9"} strokeWidth={2} />
            </View>
            <Text style={[styles.navLabel, activeTab === key && styles.navLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────
function DashboardTab({ faculty, initials, showToast }: { faculty: any; initials: string; showToast: any }) {
  const [stats, setStats] = useState({ students: 0, verified: 0, pending: 0, rejected: 0 });

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync("faculty_token");
        const res = await fetch(`${API_BASE}/faculty/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const d = await res.json(); setStats(d); }
      } catch {}
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

      {/* Stat cards */}
      <Text style={styles.sectionLabel}>Overview</Text>
      <View style={styles.statGrid}>
        {[
          { label: "Students",  value: stats.students,  color: C.navy,    bg: C.sageLight, Icon: Users },
          { label: "Verified",  value: stats.verified,  color: C.success, bg: "#DCFCE7",   Icon: CheckCircle },
          { label: "Pending",   value: stats.pending,   color: C.warning, bg: "#FEF3C7",   Icon: Clock },
          { label: "Rejected",  value: stats.rejected,  color: C.error,   bg: "#FEE2E2",   Icon: XCircle },
        ].map(({ label, value, color, bg, Icon }) => (
          <View key={label} style={[styles.statCard, { backgroundColor: bg }]}>
            <View style={[styles.statCardIcon, { backgroundColor: color + "20" }]}>
              <Icon size={18} color={color} strokeWidth={2} />
            </View>
            <Text style={[styles.statCardValue, { color }]}>{value}</Text>
            <Text style={styles.statCardLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { label: "Add Student",    Icon: UserPlus,    color: C.navy,    route: "/add-students" },
          { label: "Scan QR",        Icon: QrCode,      color: "#0EA5E9", route: null },
          { label: "View Reports",   Icon: TrendingUp,  color: "#22C55E", route: null },
          { label: "Certificates",   Icon: Award,       color: C.gold,    route: null },
        ].map(({ label, Icon, color, route }) => (
          <TouchableOpacity
            key={label}
            style={[styles.actionCard, { backgroundColor: color }]}
            onPress={() => route ? router.push(route as any) : null}
            activeOpacity={0.85}
          >
            <View style={styles.actionIconWrap}>
              <Icon size={22} color="rgba(255,255,255,0.95)" strokeWidth={2} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile card */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>My Profile</Text>
      <View style={styles.profileCard}>
        {[
          { icon: Mail,     label: "Email",  value: faculty?.email    || "—" },
          { icon: BookOpen, label: "Role",   value: "Faculty Member" },
          { icon: Shield,   label: "Status", value: "Active", color: C.success },
        ].map(({ icon: Icon, label, value, color }, i, arr) => (
          <React.Fragment key={label}>
            <View style={styles.profileRow2}>
              <Icon size={17} color={C.navyLight} strokeWidth={2} />
              <Text style={styles.profileRowLabel}>{label}</Text>
              <Text style={[styles.profileRowValue, color ? { color } : {}]}>{value}</Text>
            </View>
            {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: C.border }} />}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Students Tab ─────────────────────────────────────────────
function StudentsTab({ showToast }: { showToast: any }) {
  const [students,  setStudents]  = useState<any[]>([]);
  const [filtered,  setFiltered]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [refreshing,setRefreshing]= useState(false);
  const [selected,  setSelected]  = useState<any>(null);

  const fetchStudents = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const res = await fetch(`${API_BASE}/faculty/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.students ?? [];
        setStudents(list);
        setFiltered(list);
      } else { showToast("Failed to load students", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? students.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.usn?.toLowerCase().includes(q)  ||
      s.email?.toLowerCase().includes(q)||
      s.branch?.toLowerCase().includes(q)
    ) : students);
  }, [search, students]);

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={C.navy} size="large" /></View>;

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Search size={17} color={C.muted} strokeWidth={2} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, USN, branch…"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={10}>
            <X size={16} color={C.muted} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listCount}>{filtered.length} student{filtered.length !== 1 ? "s" : ""}</Text>
        <TouchableOpacity onPress={() => fetchStudents(true)} style={styles.refreshBtn}>
          <RefreshCw size={14} color={C.navyMid} strokeWidth={2} />
          <Text style={{ fontSize: 12, color: C.navyMid, fontWeight: "600" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString() ?? item.usn}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStudents(true); }} colors={[C.navy]} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Users size={48} color={C.sage} strokeWidth={1.5} />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 15, fontWeight: "600" }}>No students found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.studentCard} onPress={() => setSelected(item)} activeOpacity={0.8}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {item.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.name || "—"}</Text>
              <Text style={styles.studentUsn}>{item.usn} · {item.branch}</Text>
              <Text style={styles.studentEmail} numberOfLines={1}>{item.email || "—"}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={styles.studentYear}>{item.passout_year || "—"}</Text>
              <ChevronRight size={16} color={C.muted} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Student detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHandle} />
            <View style={styles.detailHeader}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>
                  {selected?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{selected?.name}</Text>
                <Text style={styles.detailUsn}>{selected?.usn}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
                <X size={20} color={C.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: C.border, marginBottom: 16 }} />
            {[
              { label: "Email",        value: selected?.email, Icon: Mail },
              { label: "Branch",       value: selected?.branch, Icon: GitBranch },
              { label: "Scheme",       value: selected?.scheme, Icon: BookOpen },
              { label: "Admitted",     value: selected?.admitted_year, Icon: Calendar },
              { label: "Passout Year", value: selected?.passout_year, Icon: Calendar },
            ].map(({ label, value, Icon }) => (
              <View key={label} style={styles.detailRow}>
                <Icon size={16} color={C.navyLight} strokeWidth={2} />
                <Text style={styles.detailRowLabel}>{label}</Text>
                <Text style={styles.detailRowValue}>{value || "—"}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── QR Scanner Tab ───────────────────────────────────────────
function ScannerTab({ showToast }: { showToast: any }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,   setScanned]   = useState(false);
  const [scanning,  setScanning]  = useState(true);
  const [result,    setResult]    = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || !scanning) return;
    setScanned(true);
    setScanning(false);
    setVerifying(true);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const res = await fetch(`${API_BASE}/faculty/verify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qr_data: data }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ success: true, ...d });
        showToast("Activity verified successfully!", "success");
      } else {
        setResult({ success: false, message: d?.detail || "Verification failed" });
        showToast(d?.detail || "Verification failed", "error");
      }
    } catch {
      setResult({ success: false, message: "Network error" });
      showToast("Network error", "error");
    } finally { setVerifying(false); }
  };

  const reset = () => { setScanned(false); setScanning(true); setResult(null); };

  if (!permission) return <View style={{ flex: 1 }} />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <QrCode size={64} color={C.sage} strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: "800", color: C.ink, marginTop: 16, textAlign: "center" }}>Camera Permission Required</Text>
        <Text style={{ color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
          We need camera access to scan student QR codes for activity verification.
        </Text>
        <TouchableOpacity style={[styles.cta, { marginTop: 24 }]} onPress={requestPermission}>
          <Text style={styles.ctaText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {scanning ? (
        <>
          <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={onBarcodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
          {/* Overlay */}
          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.scanFrame}>
              {/* Corner marks */}
              {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
                <View key={i} style={[styles.scanCorner, pos]} />
              ))}
              {/* Scan line */}
              <Animated.View style={[styles.scanLine, {
                transform: [{ translateY: scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) }]
              }]} />
            </View>
            <Text style={styles.scanHint}>Align QR code within the frame</Text>
          </View>
          {verifying && (
            <View style={styles.verifyingOverlay}>
              <ActivityIndicator size="large" color={C.white} />
              <Text style={{ color: C.white, marginTop: 12, fontWeight: "600" }}>Verifying…</Text>
            </View>
          )}
        </>
      ) : (
        <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 24 }}>
          <View style={[styles.resultBox, { borderColor: result?.success ? C.success : C.error }]}>
            {result?.success
              ? <CheckCircle size={52} color={C.success} strokeWidth={1.8} />
              : <XCircle    size={52} color={C.error}   strokeWidth={1.8} />
            }
            <Text style={[styles.resultTitle, { color: result?.success ? C.success : C.error }]}>
              {result?.success ? "Verified!" : "Failed"}
            </Text>
            {result?.student_name && <Text style={styles.resultStudent}>{result.student_name}</Text>}
            {result?.activity    && <Text style={styles.resultActivity}>{result.activity}</Text>}
            {!result?.success    && <Text style={styles.resultError}>{result?.message}</Text>}
          </View>
          <TouchableOpacity style={styles.cta} onPress={reset}>
            <QrCode size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.ctaText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Activities Tab ───────────────────────────────────────────
function ActivitiesTab({ showToast }: { showToast: any }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [filtered,   setFiltered]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const res = await fetch(`${API_BASE}/faculty/activities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.activities ?? [];
        setActivities(list);
      } else { showToast("Failed to load activities", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchActivities(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(activities.filter(a => {
      const matchSearch = !q ||
        a.student_name?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q);
      const matchFilter = filter === "all" || a.status?.toLowerCase() === filter;
      return matchSearch && matchFilter;
    }));
  }, [search, filter, activities]);

  const updateStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      const token = await SecureStore.getItemAsync("faculty_token");
      const res = await fetch(`${API_BASE}/faculty/activities/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setActivities(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        showToast(`Activity ${status}!`, "success");
      } else { showToast("Failed to update status", "error"); }
    } catch { showToast("Network error", "error"); }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={C.navy} size="large" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchWrap}>
        <Search size={17} color={C.muted} strokeWidth={2} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search activities…" placeholderTextColor="#94A3B8" style={styles.searchInput} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")} hitSlop={10}><X size={16} color={C.muted} strokeWidth={2} /></TouchableOpacity>}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.listHeader}>
        <Text style={styles.listCount}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</Text>
        <TouchableOpacity onPress={() => fetchActivities(true)} style={styles.refreshBtn}>
          <RefreshCw size={14} color={C.navyMid} strokeWidth={2} />
          <Text style={{ fontSize: 12, color: C.navyMid, fontWeight: "600" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchActivities(true); }} colors={[C.navy]} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Activity size={48} color={C.sage} strokeWidth={1.5} />
            <Text style={{ color: C.muted, marginTop: 12, fontSize: 15, fontWeight: "600" }}>No activity records</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.activityCard}>
            <View style={styles.activityCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle} numberOfLines={1}>{item.title || item.activity_name || "Activity"}</Text>
                <Text style={styles.activityStudent}>{item.student_name || "—"} · {item.usn || "—"}</Text>
                {item.category && <Text style={styles.activityCategory}>{item.category}</Text>}
              </View>
              <StatusBadge status={item.status} />
            </View>

            {item.description && (
              <Text style={styles.activityDesc} numberOfLines={2}>{item.description}</Text>
            )}

            {item.status?.toLowerCase() === "pending" && (
              <View style={styles.activityActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => updateStatus(item.id, "approved")}>
                  <CheckCircle size={15} color={C.success} strokeWidth={2.5} />
                  <Text style={[styles.actionBtnText, { color: C.success }]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => updateStatus(item.id, "rejected")}>
                  <XCircle size={15} color={C.error} strokeWidth={2.5} />
                  <Text style={[styles.actionBtnText, { color: C.error }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {item.submitted_at && (
              <Text style={styles.activityDate}>
                Submitted {new Date(item.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
function GitBranch({ size, color, strokeWidth }: any) {
  // Simple placeholder since lucide GitBranch might not exist in all versions
  return <Activity size={size} color={color} strokeWidth={strokeWidth} />;
}

const styles = StyleSheet.create({
  // Top bar
  topBar: { backgroundColor: C.navy, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16, overflow: "hidden" },
  topBarDecor1: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: C.navyLight, opacity: 0.10 },
  topBarDecor2: { position: "absolute", bottom: -20, right: 60, width: 80, height: 80, borderRadius: 40, backgroundColor: C.gold, opacity: 0.08 },
  brandRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  logoBox:     { width: 34, height: 34, borderRadius: 9, backgroundColor: C.navyMid, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  logoText:    { color: C.white, fontWeight: "800", fontSize: 15 },
  brandName:   { color: C.white, fontWeight: "700", fontSize: 13 },
  brandTagline:{ color: "#7baad4", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 1 },
  logoutIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.10)", justifyContent: "center", alignItems: "center" },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:     { width: 48, height: 48, borderRadius: 14, backgroundColor: C.navyMid, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" },
  avatarText: { color: C.white, fontWeight: "800", fontSize: 17 },
  welcomeLabel:  { color: "#8ab4d9", fontSize: 11, fontWeight: "600" },
  welcomeName:   { color: C.white, fontSize: 18, fontWeight: "800", marginTop: 1 },
  welcomeCollege:{ color: "#7baad4", fontSize: 11, marginTop: 2 },
  roleBadge:     { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,149,42,0.35)" },
  roleBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  // Bottom nav
  bottomNav:    { flexDirection: "row", backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === "ios" ? 0 : 8, paddingTop: 8 },
  navItem:      { flex: 1, alignItems: "center", paddingVertical: 6, gap: 4 },
  navItemActive:{},
  navIconWrap:  { width: 40, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  navIconWrapActive: { backgroundColor: C.navy },
  navLabel:     { fontSize: 10, fontWeight: "600", color: "#8ab4d9" },
  navLabelActive: { color: C.navy, fontWeight: "700" },

  // Sections
  sectionLabel: { fontSize: 11, fontWeight: "800", color: C.navy, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },

  // Stat grid
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: (width - 52) / 2, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  statCardIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statCardValue: { fontSize: 28, fontWeight: "800" },
  statCardLabel: { fontSize: 12, color: C.muted, fontWeight: "600", marginTop: 2 },

  // Action grid
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard:  { width: (width - 52) / 2, borderRadius: 16, padding: 16, paddingBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  actionLabel: { color: C.white, fontWeight: "700", fontSize: 13 },

  // Profile card
  profileCard:  { backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border },
  profileRow2:  { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  profileRowLabel: { flex: 1, fontSize: 14, color: C.muted, fontWeight: "600" },
  profileRowValue: { fontSize: 14, color: C.ink, fontWeight: "700" },

  // Search
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, margin: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 4, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, paddingVertical: Platform.OS === "android" ? 10 : 12 },

  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  listCount:  { fontSize: 13, fontWeight: "700", color: C.muted },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 5 },

  // Student card
  studentCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  studentAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.sageLight, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: C.sage },
  studentAvatarText: { fontSize: 15, fontWeight: "800", color: C.navy },
  studentName:  { fontSize: 15, fontWeight: "700", color: C.ink },
  studentUsn:   { fontSize: 12, color: C.navyLight, fontWeight: "600", marginTop: 2 },
  studentEmail: { fontSize: 11, color: C.muted, marginTop: 2 },
  studentYear:  { fontSize: 12, fontWeight: "700", color: C.muted },

  // Detail sheet
  detailSheet:  { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 },
  detailHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 20 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  detailAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.sageLight, justifyContent: "center", alignItems: "center" },
  detailAvatarText: { fontSize: 20, fontWeight: "800", color: C.navy },
  detailName:   { fontSize: 18, fontWeight: "800", color: C.ink },
  detailUsn:    { fontSize: 13, color: C.muted, marginTop: 3 },
  detailRow:    { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  detailRowLabel:{ flex: 1, fontSize: 14, color: C.muted, fontWeight: "600" },
  detailRowValue:{ fontSize: 14, color: C.ink, fontWeight: "700", maxWidth: width * 0.5, textAlign: "right" },

  // Scanner
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanFrame:   { width: 240, height: 240, position: "relative", justifyContent: "flex-start" },
  scanCorner:  { position: "absolute", width: 24, height: 24, borderColor: C.gold, borderWidth: 3 },
  scanLine:    { height: 2, backgroundColor: C.gold, opacity: 0.8, marginHorizontal: 8 },
  scanHint:    { color: C.white, marginTop: 24, fontSize: 14, fontWeight: "600", opacity: 0.85 },
  verifyingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center" },
  resultBox:   { backgroundColor: C.white, borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 2, marginBottom: 20 },
  resultTitle: { fontSize: 24, fontWeight: "800", marginTop: 12 },
  resultStudent:{ fontSize: 17, fontWeight: "700", color: C.ink, marginTop: 8 },
  resultActivity:{ fontSize: 14, color: C.muted, marginTop: 4 },
  resultError: { fontSize: 14, color: C.error, marginTop: 8, textAlign: "center" },

  // Activities
  filterChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  filterChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterChipText:   { fontSize: 13, fontWeight: "600", color: C.muted },
  filterChipTextActive: { color: C.white },

  activityCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  activityCardTop:  { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  activityTitle:    { fontSize: 15, fontWeight: "700", color: C.ink },
  activityStudent:  { fontSize: 12, color: C.navyLight, fontWeight: "600", marginTop: 2 },
  activityCategory: { fontSize: 11, color: C.muted, marginTop: 2 },
  activityDesc:     { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 10 },
  activityActions:  { flexDirection: "row", gap: 10, marginTop: 4 },
  approveBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC" },
  rejectBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FCA5A5" },
  actionBtnText:    { fontSize: 13, fontWeight: "700" },
  activityDate:     { fontSize: 11, color: C.muted, marginTop: 8 },

  // CTA
  cta:    { backgroundColor: C.navy, paddingVertical: 17, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
  ctaText:{ color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
});