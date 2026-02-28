// app/(student)/history.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, XCircle, RefreshCw } from "lucide-react-native";

// ─── Config ───────────────────────────────────────────────────
const BASE_URL = "http://31.97.230.171:8000/api";

// ─── Storage keys ─────────────────────────────────────────────
const REG_PREFIX = "reg_";
const DONE_PREFIX = "done_";

// ─── Colour tokens ────────────────────────────────────────────
const C = {
  navy: "#0B2D6B",
  navyMid: "#1A47A0",
  navyLight: "#3B6FD4",
  sage: "#C7D8F5",
  sageLight: "#EBF1FB",
  gold: "#C9952A",
  white: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  bg: "#F0F4FC",
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  border: "#E2E8F0",
};

type Me = { name?: string };

interface AdminEvent {
  id: number;
  title: string;
  description?: string;
  date?: string;
  event_date?: string;
  start_time?: string;
  event_time?: string;
  end_time?: string;
  ended_at?: string;
  location?: string;
  venue_name?: string;
  points?: number;
  status?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
async function getToken(): Promise<string> {
  // same robust token search as your camera screen (simplified)
  const directKeys = ["access_token", "accessToken", "token", "authToken", "auth_token", "jwt"];

  const normalize = (t: any) => {
    if (!t) return "";
    let s = String(t).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
    if (s.toLowerCase().startsWith("bearer ")) s = s.slice(7).trim();
    return s;
  };

  for (const k of directKeys) {
    const raw = await AsyncStorage.getItem(k);
    const tok = normalize(raw);
    if (tok) return tok;
    if (raw && raw.trim().startsWith("{")) {
      try {
        const p = JSON.parse(raw);
        const tok2 = normalize(p.access_token ?? p.accessToken ?? p.token ?? p.jwt);
        if (tok2) return tok2;
      } catch {}
    }
  }

  // container keys
  for (const k of ["user", "auth", "session", "userData", "student", "profile"]) {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      const tok = normalize(
        p.access_token ??
          p.accessToken ??
          p.token ??
          p.jwt ??
          p?.data?.access_token ??
          p?.data?.token ??
          p?.user?.access_token ??
          p?.student?.access_token
      );
      if (tok) return tok;
    } catch {}
  }

  return "";
}

async function getActiveStudentId(): Promise<string> {
  const existing = await AsyncStorage.getItem("active_student_id");
  if (existing && existing !== "0") return existing;

  // don’t block history if missing
  return existing || "0";
}

const authFetch = async (path: string, opts: RequestInit = {}) => {
  const token = await getToken();
  const headers: any = { Accept: "application/json", ...(opts.headers || {}) };
  if (opts.body && !(opts.body instanceof FormData)) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { ...opts, headers });
};

function getEventDate(e: AdminEvent): string {
  return (e.event_date ?? e.date ?? "").trim();
}

function formatDate(d: string): string {
  if (!d) return "TBD";
  const parts = d.split("T")[0].split("-");
  if (parts.length === 3) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(m) && m >= 0 && m <= 11) return `${day} ${months[m]} ${y}`;
  }
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

export default function HistoryScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [regMap, setRegMap] = useState<Record<number, "registered" | "submitted" | "none">>({});
  const [doneMap, setDoneMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ UPDATED: reads BOTH legacy + new namespaced keys
  const loadLocalStatus = useCallback(async () => {
    const sid = await getActiveStudentId();
    const nsRegPrefix = `stu_${sid}_reg_`;
    const nsDonePrefix = `stu_${sid}_done_`;

    const keys = await AsyncStorage.getAllKeys();

    const regKeys = keys.filter((k) => k.startsWith(REG_PREFIX) || k.startsWith(nsRegPrefix));
    const doneKeys = keys.filter((k) => k.startsWith(DONE_PREFIX) || k.startsWith(nsDonePrefix));

    const nextReg: Record<number, any> = {};
    const nextDone: Record<number, boolean> = {};

    const parseId = (key: string) => {
      if (key.startsWith(nsRegPrefix)) return parseInt(key.replace(nsRegPrefix, ""), 10);
      if (key.startsWith(nsDonePrefix)) return parseInt(key.replace(nsDonePrefix, ""), 10);
      if (key.startsWith(REG_PREFIX)) return parseInt(key.replace(REG_PREFIX, ""), 10);
      if (key.startsWith(DONE_PREFIX)) return parseInt(key.replace(DONE_PREFIX, ""), 10);
      return NaN;
    };

    if (regKeys.length) {
      const pairs = await AsyncStorage.multiGet(regKeys);
      for (const [k, v] of pairs) {
        const id = parseId(k);
        if (!isNaN(id) && (v === "registered" || v === "submitted")) nextReg[id] = v;
      }
    }

    if (doneKeys.length) {
      const pairs = await AsyncStorage.multiGet(doneKeys);
      for (const [k, v] of pairs) {
        const id = parseId(k);
        if (!isNaN(id) && (v === "done" || v === "true" || v === "1")) nextDone[id] = true;
      }
    }

    setRegMap(nextReg);
    setDoneMap(nextDone);
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await authFetch("/students/me", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMe({ name: data?.name ?? data?.full_name ?? data?.student_name });
    } catch {}
  }, []);

  const fetchEvents = useCallback(async () => {
    const res = await authFetch("/student/events", { method: "GET" });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw (typeof data?.detail === "string" ? data.detail : "Failed to load events");
    return Array.isArray(data) ? (data as AdminEvent[]) : [];
  }, []);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await Promise.all([fetchMe(), loadLocalStatus()]);
      const list = await fetchEvents();
      setEvents(list);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, fetchMe, loadLocalStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const historyEvents = useMemo(() => {
    const attendedIds = new Set<number>();
    for (const [k, v] of Object.entries(regMap)) if (v === "submitted") attendedIds.add(Number(k));
    for (const [k, v] of Object.entries(doneMap)) if (v) attendedIds.add(Number(k));

    return events
      .filter((e) => attendedIds.has(e.id))
      .sort((a, b) => (getEventDate(b) || "").localeCompare(getEventDate(a) || ""));
  }, [doneMap, events, regMap]);

  const studentName = (me?.name ?? "").trim() || "Student";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <ArrowLeft size={18} color={C.white} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={s.title}>History</Text>
          <Text style={s.subTitle} numberOfLines={1}>
            {studentName} · Activities you attended
          </Text>
        </View>

        <TouchableOpacity style={s.iconBtn} onPress={onRefresh} activeOpacity={0.85}>
          <RefreshCw size={18} color={C.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.navy} colors={[C.navy]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={C.navy} />
            <Text style={s.centerText}>Loading history…</Text>
          </View>
        ) : error ? (
          <View style={s.centerBox}>
            <View style={s.errorIconWrap}>
              <XCircle size={32} color={C.error} strokeWidth={2} />
            </View>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : historyEvents.length === 0 ? (
          <View style={s.centerBox}>
            <FileText size={44} color={C.sage} strokeWidth={1.5} />
            <Text style={s.centerText}>No attended activities yet.</Text>
            <Text style={s.centerSub}>Once you submit an activity, it will appear here.</Text>
          </View>
        ) : (
          historyEvents.map((ev) => {
            const dateStr = getEventDate(ev);
            const submitted = regMap[ev.id] === "submitted" || !!doneMap[ev.id];

            return (
              <View key={ev.id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardTitle} numberOfLines={2}>
                    {ev.title}
                  </Text>

                  {submitted ? (
                    <View style={s.badgeSuccess}>
                      <CheckCircle size={12} color={C.success} strokeWidth={2.5} />
                      <Text style={s.badgeTextSuccess}>Submitted</Text>
                    </View>
                  ) : (
                    <View style={s.badgePending}>
                      <Clock size={12} color={C.warning} strokeWidth={2.5} />
                      <Text style={s.badgeTextPending}>Registered</Text>
                    </View>
                  )}
                </View>

                <View style={s.metaRow}>
                  <Calendar size={12} color={C.navyMid} strokeWidth={2} />
                  <Text style={s.metaText}>{formatDate(dateStr)}</Text>
                </View>

                {!!ev.description && (
                  <Text style={s.desc} numberOfLines={2}>
                    {ev.description}
                  </Text>
                )}

                <TouchableOpacity
  style={s.viewBtn}
  onPress={() =>
    router.push({
      pathname: "/(student)/history-details",
      params: {
        eventId: String(ev.id),
        title: ev.title,
        date: getEventDate(ev),
        location: String(ev.location ?? ev.venue_name ?? ""),
        desc: String(ev.description ?? ""),
      },
    })
  }
  activeOpacity={0.85}
>
  <Text style={s.viewBtnText}>View</Text>
</TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    backgroundColor: C.navy,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: C.white, fontWeight: "900", fontSize: 18 },
  subTitle: { color: "#7baad4", fontSize: 11, fontWeight: "600", marginTop: 2 },

  centerBox: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  centerText: { color: C.muted, fontSize: 15, fontWeight: "700" },
  centerSub: { color: C.muted, fontSize: 12, opacity: 0.75, textAlign: "center", paddingHorizontal: 18 },

  errorIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },
  errorText: { color: C.error, fontSize: 14, fontWeight: "700", textAlign: "center", paddingHorizontal: 24 },

  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "900", color: C.ink },

  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  badgeTextSuccess: { fontSize: 11, fontWeight: "800", color: C.success },

  badgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  badgeTextPending: { fontSize: 11, fontWeight: "800", color: C.warning },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaText: { fontSize: 12, color: C.muted, fontWeight: "600" },

  desc: { marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 18 },

  viewBtn: {
    alignSelf: "flex-end",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.navyMid,
  },
  viewBtnText: { color: C.white, fontWeight: "900", fontSize: 12 },
});