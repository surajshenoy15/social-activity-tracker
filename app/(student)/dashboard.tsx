// app/(student)/dashboard.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  TrendingUp,
  FileText,
  Star,
  Play,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  User,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
const VikasanaLogo = require("../../assets/images/vikasana_logo.png");
// ─── Config ───────────────────────────────────────────────────
const BASE_URL = "http://31.97.230.171:8000/api";

// ─── Storage keys ─────────────────────────────────────────────
const REG_PREFIX = "reg_";

const PROG_PREFIX = "prog_";
const DONE_PREFIX = "done_";

// ✅ NEW FLOW keys (EventSubmission based)
const SUBMISSION_PREFIX = "subm_";          // stores event_submission_id
const PROG_SUBMISSION_PREFIX = "prog_subm_"; // stores event_submission_id

// ✅ OPTIONAL (only if you later use ActivitySession id anywhere)
const SESSION_PREFIX = "sess_";             // stores activity_session_id

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

type EventTab = "Upcoming" | "Ongoing" | "Past";
const EVENT_TABS: EventTab[] = ["Upcoming", "Ongoing", "Past"];

type Stats = {
  total?: number;
  approved?: number;
  pending?: number;
  rejected?: number;
  rank?: number;
  total_points?: number;
  next_milestone?: number;
};

type Me = {
  id?: number;
  name?: string;
  usn?: string;
  email?: string;
  branch?: string;
  face_enrolled?: boolean;
  total_points_earned?: number;
  required_total_points?: number;
};

type ActivitySummary = {
  student_id: number;
  student_type: string;
  required_points: number;
  earned_points: number;
  remaining_points: number;
  completion_percent: number;
  is_completed: boolean;
  breakdown: Array<{
    activity_type_id: number;
    activity_type_name: string;
    total_hours: number;
    points_awarded: number;
    max_points: number;
    completed: boolean;
  }>;
};

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

  category?: string;
  points?: number;

  max_participants?: number;
  capacity?: number;
  registered_count?: number;

  status?: string;
  thumbnail_url?: string | null;

  is_active?: boolean;
  user_registered?: boolean;

  activity_type_id?: number;
  activity_name?: string;

  has_certificates?: boolean;
}

type CertificateItem = {
  id?: number;
  certificate_id?: number;
  event_id?: number;
  title?: string;
  name?: string;
  url?: string;
  pdf_url?: string;
  download_url?: string;
  file_url?: string;
  created_at?: string;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const safeJsonString = (obj: any) => {
  try {
    if (typeof obj === "string") return obj;
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

async function getToken(): Promise<string> {
  const t1 = await AsyncStorage.getItem("access_token");
  const t2 = await AsyncStorage.getItem("token");
  return t1 || t2 || "";
}

const authFetch = async (path: string, opts: RequestInit = {}) => {
  const token = await getToken();
  const headers: any = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(`${BASE_URL}${path}`, { ...opts, headers });
};

function initialsFromName(name?: string) {
  const n = (name ?? "").trim();
  if (!n) return "ST";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "S").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "T").toUpperCase();
  return `${a}${b}`;
}

// ─── Date helpers ─────────────────────────────────────────────
function getEventDate(e: AdminEvent): string {
  return (e.event_date ?? e.date ?? "").trim();
}
function getEventStartTime(e: AdminEvent): string {
  return (e.start_time ?? e.event_time ?? "").trim();
}
function getEventEndRaw(e: AdminEvent): string {
  return (e.ended_at ?? e.end_time ?? "").trim();
}

function formatDate(d: string): string {
  if (!d) return "TBD";
  const parts = d.split("T")[0].split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

function formatTime(t?: string): string {
  if (!t) return "";
  try {
    if (t.includes("T")) {
      const dt = new Date(t);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      }
    }

    const clean = t.split(":").slice(0, 2).join(":");
    const [h, m] = clean.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return t;
  }
}

function parseEventDateTime(e: AdminEvent) {
  const dateStr = getEventDate(e).split("T")[0];
  const start = getEventStartTime(e);
  const endRaw = getEventEndRaw(e);

  if (!dateStr) return { startAt: null as Date | null, endAt: null as Date | null };

  if (endRaw && endRaw.includes("T")) {
    const endDt = new Date(endRaw);
    const startDt = (() => {
      if (start && start.includes("T")) {
        const sd = new Date(start);
        return isNaN(sd.getTime()) ? null : sd;
      }
      const [yy, mm, dd] = dateStr.split("-").map(Number);
      const base = new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
      const [h, m, s] = (start || "00:00:00").split(":").map((n) => parseInt(n, 10));
      const st = new Date(base);
      st.setHours(h || 0, m || 0, s || 0, 0);
      return st;
    })();

    return {
      startAt: startDt,
      endAt: isNaN(endDt.getTime()) ? null : endDt,
    };
  }

  const [yy, mm, dd] = dateStr.split("-").map(Number);
  const base = new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);

  const toTime = (t: string) => {
    if (!t) return null;
    const [h, m, s] = t.split(":").map((n) => parseInt(n, 10));
    const d = new Date(base);
    d.setHours(h || 0, m || 0, s || 0, 0);
    return d;
  };

  const startAt = toTime(start) ?? base;
  const endAt = toTime(endRaw);

  return { startAt, endAt };
}

function deriveStatus(e: AdminEvent): "upcoming" | "ongoing" | "past" {
  const apiStatus = (e.status ?? "").toLowerCase();

  const isActive = (e as any).is_active;
  const isActiveFalse = isActive === false || isActive === 0 || String(isActive).toLowerCase() === "false";
  if (isActiveFalse) return "past";

  if (apiStatus === "ended" || apiStatus === "inactive" || apiStatus === "closed") return "past";
  if (apiStatus === "upcoming" || apiStatus === "ongoing" || apiStatus === "past") return apiStatus as any;

  const { startAt, endAt } = parseEventDateTime(e);
  if (!startAt) return "upcoming";

  const now = new Date();

  if (endAt) {
    if (now < startAt) return "upcoming";
    if (now > endAt) return "past";
    return "ongoing";
  }

  const dayEnd = new Date(startAt);
  dayEnd.setHours(23, 59, 59, 999);

  if (now < startAt) return "upcoming";
  if (now > dayEnd) return "past";
  return "ongoing";
}

function daysUntil(e: AdminEvent): number | null {
  const dateStr = getEventDate(e);
  if (!dateStr) return null;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const ev = new Date(+parts[0], +parts[1] - 1, +parts[2], 0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  ev.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((ev.getTime() - today.getTime()) / 86400000));
}

function normalizeThumbUrl(raw?: string | null): string | null {
  const u = (raw ?? "").trim();
  if (!u) return null;
  if (u.startsWith("/")) return `http://31.97.230.171:9000${u}`;
  return u;
}

// ✅ CERTIFICATE FIX: try multiple endpoints (because /student/events/:id/certificates is 404 on your server)
async function fetchEventCertificates(eventId: number): Promise<CertificateItem[]> {
  const paths = [
    `/student/events/${eventId}/certificates`, // your current call (404 in logs)
    `/student/events/${eventId}/certificate`, // common alt
    `/student/certificates?event_id=${eventId}`, // common alt
    `/student/certificates/${eventId}`, // common alt
  ];

  let lastErr: any = null;

  for (const path of paths) {
    try {
      const res = await authFetch(path, { method: "GET" });

      // if not found, try next path
      if (res.status === 404) continue;

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        lastErr = data?.detail ?? data ?? `HTTP ${res.status}`;
        continue;
      }

      // Normalize to list
      if (Array.isArray(data)) return data as CertificateItem[];

      // sometimes backend returns {items:[...]} or {certificates:[...]}
      const maybe =
        (data as any)?.items ??
        (data as any)?.certificates ??
        (data as any)?.data ??
        (data ? [data] : []);

      return Array.isArray(maybe) ? (maybe as CertificateItem[]) : [];
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  // If all endpoints 404, treat as "no certificates"
  if (lastErr == null) return [];
  return [];
}

function DotStrip() {
  return (
    <View style={{ flexDirection: "row", gap: 5, marginBottom: 16, paddingHorizontal: 20, paddingTop: 4 }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: i % 3 === 0 ? C.gold : C.sage,
            opacity: 0.55,
          }}
        />
      ))}
    </View>
  );
}

function CategoryChip({ category }: { category: string }) {
  const map: Record<string, string> = {
    "Health & Wellness": "#7C3AED",
    Environment: "#16A34A",
    Education: "#1A47A0",
    Sports: "#DC2626",
    "Arts & Culture": "#C9952A",
    Community: "#0891B2",
  };
  const color = map[category] ?? C.navyMid;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: color + "18",
        borderWidth: 1,
        borderColor: color + "40",
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color }}>{category}</Text>
    </View>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warning" } | null>(null);
  const anim = useRef(new Animated.Value(-90)).current;

  const show = useCallback(
    (msg: string, type: "success" | "warning" = "success") => {
      setToast({ msg, type });
      Animated.sequence([
        Animated.spring(anim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(anim, { toValue: -90, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    },
    [anim]
  );

  return { toast, anim, show };
}

// ─── Event Card ───────────────────────────────────────────────
function EventCard({
  event,
  regStatus,
  isInProgress,
  isDone,
  onRegister,
  onStart,
  onContinue,
  onCertificates,
  certificatesLoading,
}: {
  event: AdminEvent;
  regStatus: "none" | "registered" | "submitted";
  isInProgress: boolean;
  isDone: boolean;
  onRegister: () => void;
  onStart: () => void;
  onContinue: () => void;

  onCertificates: () => void;
  certificatesLoading: boolean;
}) {
  const [thumbError, setThumbError] = useState(false);

  const status = deriveStatus(event);
  const registered = regStatus === "registered";
  const submitted = regStatus === "submitted";

  const total = event.max_participants ?? event.capacity ?? 100;
  const regCount = event.registered_count ?? 0;
  const fillPct = total > 0 ? Math.min(100, Math.round((regCount / total) * 100)) : 0;
  const isFull = regCount >= total;

  const accentColor = status === "upcoming" ? C.navyMid : status === "ongoing" ? C.success : C.muted;

  const thumbUrl = normalizeThumbUrl(event.thumbnail_url);
  const showThumb = !!thumbUrl && !thumbError;

  const dateStr = getEventDate(event);
  const startTime = getEventStartTime(event);
  const dLeft = daysUntil(event);

  const canRegister = !registered && !submitted && status === "ongoing";
  const canStart = registered && !submitted && !isInProgress && !isDone && status === "ongoing";
  const canContinue = registered && !submitted && isInProgress && !isDone && status === "ongoing";
  const canViewSubmission = submitted;

  // Certificates only on Past
  const canCertificates = status === "past";

  return (
    <View style={ec.card}>
      {showThumb ? (
        <View style={ec.thumbWrap}>
          <Image source={{ uri: thumbUrl! }} style={ec.thumb} resizeMode="cover" onError={() => setThumbError(true)} />
          <View style={[ec.thumbAccent, { backgroundColor: accentColor }]} />
          {status === "ongoing" && (
            <View style={ec.liveChip}>
              <View style={ec.liveDot} />
              <Text style={ec.liveText}>LIVE</Text>
            </View>
          )}
          {!!event.category && (
            <View style={ec.thumbCatWrap}>
              <CategoryChip category={event.category} />
            </View>
          )}
          <View style={ec.ptsOnThumb}>
            <TrendingUp size={11} color={C.white} strokeWidth={2.5} />
            <Text style={ec.ptsOnThumbText}>+{event.points ?? 0} pts</Text>
          </View>
        </View>
      ) : (
        <View style={[ec.fallbackBanner, { borderTopColor: accentColor }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!!event.category && <CategoryChip category={event.category} />}
            {status === "ongoing" && (
              <View style={ec.liveChipSmall}>
                <View style={ec.liveDot} />
                <Text style={ec.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          <View style={ec.ptsOnThumb}>
            <TrendingUp size={11} color={C.navyMid} strokeWidth={2.5} />
            <Text style={[ec.ptsOnThumbText, { color: C.navyMid }]}>+{event.points ?? 0} pts</Text>
          </View>
        </View>
      )}

      <View style={ec.body}>
        <View style={ec.titleRow}>
          <Text style={ec.title} numberOfLines={2}>
            {event.title}
          </Text>
          {status === "upcoming" && dLeft !== null && (
            <View style={ec.countBadge}>
              <Text style={ec.countDays}>{dLeft}</Text>
              <Text style={ec.countLabel}>days</Text>
            </View>
          )}
        </View>

        {!!event.description && (
          <Text style={ec.desc} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        <View style={ec.metaGrid}>
          <View style={ec.metaItem}>
            <Calendar size={12} color={C.navyMid} strokeWidth={2} />
            <Text style={ec.metaText}>{formatDate(dateStr)}</Text>
          </View>

          {!!startTime && (
            <View style={ec.metaItem}>
              <Clock size={12} color={C.navyMid} strokeWidth={2} />
              <Text style={ec.metaText}>{formatTime(startTime)}</Text>
            </View>
          )}

          {!!(event.venue_name || event.location) && (
            <View style={ec.metaItem}>
              <MapPin size={12} color={C.navyMid} strokeWidth={2} />
              <Text style={ec.metaText} numberOfLines={1}>
                {event.venue_name ?? event.location}
              </Text>
            </View>
          )}

          <View style={ec.metaItem}>
            <Users size={12} color={C.navyMid} strokeWidth={2} />
            <Text style={ec.metaText}>
              {regCount}/{total} registered
            </Text>
          </View>
        </View>

        <View style={ec.fillBar}>
          <View style={[ec.fillFill, { width: `${fillPct}%`, backgroundColor: fillPct > 80 ? C.warning : C.navyMid }]} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 3, marginBottom: 12 }}>
          <Text style={ec.fillLabel}>{fillPct}% filled</Text>
          {isFull ? (
            <Text style={[ec.fillLabel, { color: C.error }]}>Full</Text>
          ) : (
            <Text style={ec.fillLabel}>{Math.max(0, total - regCount)} spots left</Text>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: C.border, marginBottom: 12 }} />

        <View style={ec.footer}>
          

          {canCertificates && (
            <TouchableOpacity
              style={[ec.primaryBtn, certificatesLoading && { opacity: 0.75 }]}
              onPress={onCertificates}
              activeOpacity={0.85}
              disabled={certificatesLoading}
            >
              {certificatesLoading ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <FileText size={14} color={C.white} strokeWidth={2.5} />
              )}
              <Text style={ec.primaryBtnText}>{certificatesLoading ? "Checking..." : "Certificates"}</Text>
              <ArrowRight size={14} color={C.white} strokeWidth={2.5} />
            </TouchableOpacity>
          )}

          {canRegister && (
            <TouchableOpacity
              style={[ec.registerBtn, isFull && ec.disabledBtn]}
              onPress={onRegister}
              disabled={isFull}
              activeOpacity={0.82}
            >
              <Text style={[ec.registerBtnText, isFull && { color: C.muted }]}>{isFull ? "Full" : "Register"}</Text>
            </TouchableOpacity>
          )}

          {(canContinue || canStart || (registered && !submitted && isDone)) && (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {isDone ? (
                <View style={ec.doneBadge}>
                  <CheckCircle size={14} color={C.white} strokeWidth={2.5} />
                  <Text style={ec.doneText}>Submitted</Text>
                </View>
              ) : (
                <>
                  <View style={ec.regBadge}>
                    <CheckCircle size={13} color={C.success} strokeWidth={2.5} />
                    <Text style={ec.regText}>{canContinue ? "In Progress" : "Registered"}</Text>
                  </View>

                  {canContinue ? (
                    <TouchableOpacity style={ec.startBtn} onPress={onContinue} activeOpacity={0.85}>
                      <Play size={13} color={C.white} strokeWidth={2.5} style={{ marginLeft: 2 }} />
                      <Text style={ec.startText}>Continue</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={ec.startBtn} onPress={onStart} activeOpacity={0.85}>
                      <Play size={13} color={C.white} strokeWidth={2.5} style={{ marginLeft: 2 }} />
                      <Text style={ec.startText}>Start</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {registered && !isDone && status === "past" && (
            <View style={[ec.regBadge, { borderColor: C.border, backgroundColor: C.sageLight }]}>
              <Clock size={13} color={C.muted} strokeWidth={2} />
              <Text style={[ec.regText, { color: C.muted }]}>Ended</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function StudentHome() {
  const [activeEventTab, setActiveEventTab] = useState<EventTab>("Upcoming");

  const [me, setMe] = useState<Me | null>(null);

  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    rank: 0,
    total_points: 0,
    next_milestone: 0,
  });

  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [registrations, setRegistrations] = useState<Record<number, "none" | "registered" | "submitted">>({});
  const [inProgress, setInProgress] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // ✅ certificate checking loader per event
  const [certLoading, setCertLoading] = useState<Record<number, boolean>>({});

  const { toast, anim: toastAnim, show: showToast } = useToast();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(30)).current;

  // ── Location ────────────────────────────────────────────────
  const ensureLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
    } catch {
      // ignore
    }
  }, []);

  // ── Persisted state ─────────────────────────────────────────
  const loadPersistedState = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();

      const regKeys = keys.filter((k) => k.startsWith(REG_PREFIX));
      if (regKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(regKeys);
        const map: Record<number, "registered" | "submitted"> = {};
        pairs.forEach(([k, v]) => {
          const id = parseInt(k.replace(REG_PREFIX, ""), 10);
          if (!isNaN(id) && (v === "registered" || v === "submitted")) map[id] = v as any;
        });
        setRegistrations((prev) => ({ ...prev, ...map }));
      }

      const progKeys = keys.filter((k) => k.startsWith(PROG_PREFIX));
      if (progKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(progKeys);
        const pmap: Record<number, boolean> = {};
        pairs.forEach(([k, v]) => {
          const id = parseInt(k.replace(PROG_PREFIX, ""), 10);
          if (!isNaN(id) && v === "in_progress") pmap[id] = true;
        });
        setInProgress((prev) => ({ ...prev, ...pmap }));
      }

      const doneKeys = keys.filter((k) => k.startsWith(DONE_PREFIX));
      if (doneKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(doneKeys);
        const dmap: Record<number, boolean> = {};
        pairs.forEach(([k, v]) => {
          const id = parseInt(k.replace(DONE_PREFIX, ""), 10);
          if (!isNaN(id) && v === "done") dmap[id] = true;
        });
        setDone((prev) => ({ ...prev, ...dmap }));
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Fetch student profile ───────────────────────────────────
 const fetchMe = useCallback(async () => {
  try {
    const res = await authFetch("/students/me", { method: "GET" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data?.detail ?? data;

    setMe({
      id: data?.id,
      name: data?.name ?? data?.full_name ?? data?.student_name,
      usn: data?.usn,
      email: data?.email,
      branch: data?.branch,
      face_enrolled: data?.face_enrolled,
      total_points_earned: Number(data?.total_points_earned ?? 0) || 0,
      required_total_points: Number(data?.required_total_points ?? 0) || 0,
    });

    setStats((prev) => ({
      ...prev,
      total_points: Number(data?.total_points_earned ?? 0) || 0,
      next_milestone: Number(data?.required_total_points ?? 0) || 0,
    }));
  } catch {
    // ignore
  }
}, []);

    

  // ── Face enroll redirect ────────────────────────────────────
  const ensureFaceEnroll = useCallback(async () => {
    try {
      const res = await authFetch("/students/me", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.face_enrolled === false) {
        router.replace("/(student)/face-enroll");
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Fetch stats (UPDATED: counts from sessions if summary doesn't provide them) ──
const fetchStats = useCallback(async () => {
  // 1) summary endpoints (for points/milestone/rank + sometimes counts)
  const tryPaths = ["/student/activity/summary", "/student/dashboard", "/student/summary", "/activity/summary"];

  // helper: safe normalize status
  const norm = (v: any) => String(v ?? "").trim().toUpperCase();

  // helper: fetch list of my sessions/submissions and compute counts
  const computeCountsFallback = async () => {
    const listPaths = [
  "/student/activity/sessions",   // ✅ correct route
];

    for (const p of listPaths) {
      try {
        const r = await authFetch(p, { method: "GET" });
        if (r.status === 404) continue;

        const j = await r.json().catch(() => null);
        if (!r.ok) continue;

        const rows: any[] = Array.isArray(j) ? j : j?.items ?? j?.sessions ?? j?.records ?? j?.submissions ?? [];
        if (!Array.isArray(rows)) continue;

        let total = 0;
        let approved = 0;
        let rejected = 0;
        let pending = 0;

        for (const row of rows) {
          const st = norm(row?.status ?? row?.session_status ?? row?.state);

          // exclude drafts from Submitted count (optional)
          if (st === "DRAFT") continue;

          total++;

          if (st === "APPROVED") approved++;
          else if (st === "REJECTED") rejected++;
          else if (st === "SUBMITTED" || st === "IN_PROGRESS" || st === "FLAGGED") pending++;
          else pending++; // unknown -> pending
        }

        return { total, approved, pending, rejected };
      } catch {
        continue;
      }
    }

    return null;
  };

  for (const path of tryPaths) {
    try {
      const res = await authFetch(path, { method: "GET" });
      if (res.status === 404) continue;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw data?.detail ?? data;

      const summary = data as Partial<ActivitySummary>;

      // points + milestone
      const rawEarned =
  (summary as any)?.earned_points ??
  (summary as any)?.total_points ??
  (summary as any)?.total_points_earned ??
  (data as any)?.earned_points ??
  (data as any)?.total_points ??
  (data as any)?.total_points_earned;

const rawRequired =
  (summary as any)?.required_points ??
  (summary as any)?.required_total_points ??
  (summary as any)?.next_milestone ??
  (data as any)?.required_points ??
  (data as any)?.required_total_points ??
  (data as any)?.next_milestone;

const earned = rawEarned != null ? Number(rawEarned) || 0 : null;
const required = rawRequired != null ? Number(rawRequired) || 0 : null;

      // try getting counts from summary response
      const fromApi = {
        total:
          Number((data as any)?.total ?? (data as any)?.submissions_total ?? (data as any)?.submitted ?? NaN),
        approved:
          Number((data as any)?.approved ?? (data as any)?.submissions_approved ?? NaN),
        pending:
          Number((data as any)?.pending ?? (data as any)?.submissions_pending ?? NaN),
        rejected:
          Number((data as any)?.rejected ?? (data as any)?.submissions_rejected ?? NaN),
      };

      const hasCounts =
        Number.isFinite(fromApi.total) ||
        Number.isFinite(fromApi.approved) ||
        Number.isFinite(fromApi.pending) ||
        Number.isFinite(fromApi.rejected);

      // ✅ fallback: compute counts from session list if missing/zero
      let fallbackCounts: any = null;
      if (!hasCounts || ((fromApi.total || 0) === 0 && (fromApi.approved || 0) === 0 && (fromApi.pending || 0) === 0 && (fromApi.rejected || 0) === 0)) {
        fallbackCounts = await computeCountsFallback();
      }

      setStats((prev) => ({
  ...prev,
  total: fallbackCounts?.total ?? (Number.isFinite(fromApi.total) ? fromApi.total : prev.total ?? 0),
  approved: fallbackCounts?.approved ?? (Number.isFinite(fromApi.approved) ? fromApi.approved : prev.approved ?? 0),
  pending: fallbackCounts?.pending ?? (Number.isFinite(fromApi.pending) ? fromApi.pending : prev.pending ?? 0),
  rejected: fallbackCounts?.rejected ?? (Number.isFinite(fromApi.rejected) ? fromApi.rejected : prev.rejected ?? 0),
  rank: (data as any)?.rank ?? (summary as any)?.rank ?? prev.rank ?? 0,

  // ✅ only overwrite if backend actually returned point fields
  total_points: earned !== null ? earned : prev.total_points ?? 0,
  next_milestone: required !== null ? required : prev.next_milestone ?? 0,
}));

      return;
    } catch {
      continue;
    }
  }

  // If all summary endpoints fail, still try fallback counts
  try {
    const fallbackCounts = await computeCountsFallback();
    if (fallbackCounts) {
      setStats((prev) => ({ ...prev, ...fallbackCounts }));
    }
  } catch {}
}, []);

  // ✅ Cleanup local "in_progress" if admin ended the event
  const cleanupIfEnded = useCallback(async (list: AdminEvent[]) => {
    const endedIds = list
      .filter((ev) => deriveStatus(ev) === "past")
      .map((ev) => Number(ev.id))
      .filter((id) => Number.isFinite(id));

    if (!endedIds.length) return;

    const removeKeys: string[] = [];
    for (const id of endedIds) {
      removeKeys.push(
  `${PROG_PREFIX}${id}`,
  `${SUBMISSION_PREFIX}${id}`,
  `${PROG_SUBMISSION_PREFIX}${id}`,
  `${SESSION_PREFIX}${id}` // optional
);
    }

    try {
      await AsyncStorage.multiRemove(removeKeys);
    } catch {}

    setInProgress((prev) => {
      const next = { ...prev };
      for (const id of endedIds) next[id] = false;
      return next;
    });
  }, []);

  // ── Fetch events ─────────────────────────────────────────────
const fetchEvents = useCallback(async (isRefresh = false) => {
  if (isRefresh) setRefreshing(true);
  else {
    setEventsLoading(true);
    setError(null);
  }

  try {
    const res = await authFetch("/student/events", { method: "GET" });
    const data = await res.json().catch(() => []);
    console.log('Raw Events Data:', data);  // Log the response data here
    if (!res.ok) throw data?.detail ?? data;

    const list: AdminEvent[] = Array.isArray(data) ? data : [];
    console.log('Parsed Events:', list); // Log the parsed events

    setEvents(list);
    setError(null);
  } catch (err: any) {
    console.error('Error fetching events:', err);
    setError(typeof err === "string" ? err : err?.message ?? "Failed to load activities.");
  } finally {
    setEventsLoading(false);
    setRefreshing(false);
  }
}, []);
  // ── One refresh handler ──────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMe(), fetchStats(), fetchEvents(true)]);
    setRefreshing(false);
  }, [fetchEvents, fetchMe, fetchStats]);

  // ── Register ────────────────────────────────────────────────
  const handleRegister = useCallback(
    async (event: AdminEvent) => {
      try {
        const res = await authFetch(`/student/events/${event.id}/register`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw data?.detail ?? data;

        await AsyncStorage.setItem(`${REG_PREFIX}${event.id}`, "registered");
        setRegistrations((prev) => ({ ...prev, [event.id]: "registered" }));

        await refreshAll();
        showToast("Registration completed.", "success");
      } catch (e: any) {
        const msg = safeJsonString(e);
        showToast("Registration failed.", "warning");
        Alert.alert("Error", msg);
      }
    },
    [refreshAll, showToast]
  );

  // ── Start session ────────────────────────────────────────────
 const startSession = useCallback(
  async (event: AdminEvent) => {
    try {
      const eventId = Number(event?.id);
      if (!eventId) {
        Alert.alert("Error", "Missing event_id. Please refresh and try again.");
        return;
      }

      const status = deriveStatus(event);
      if (status !== "ongoing") {
        const when =
          status === "upcoming"
            ? "This activity is not active yet. Please start it on the event day/time."
            : "This activity has already ended.";
        Alert.alert("Not available", when);
        return;
      }

      await ensureLocation();

      // ✅ NEW FLOW: register returns submission_id
      const res = await authFetch(`/student/events/${eventId}/register`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : typeof data === "string"
            ? data
            : safeJsonString(data);
        throw msg;
      }

      const submissionId = data?.submission_id ?? data?.id;
      if (!submissionId) throw "Registered but submission_id missing in response";

      // ✅ store submission_id (not session_id)
      await AsyncStorage.setItem(`${SUBMISSION_PREFIX}${eventId}`, String(submissionId));
      await AsyncStorage.setItem(`${PROG_PREFIX}${eventId}`, "in_progress");
      await AsyncStorage.setItem(`${PROG_SUBMISSION_PREFIX}${eventId}`, String(submissionId));

      setInProgress((prev) => ({ ...prev, [eventId]: true }));

      // ✅ go to event camera screen (submission-based)
      router.push({
        pathname: "/(student)/activity-camera", // ✅ create this screen OR rename your camera screen
        params: { submissionId: String(submissionId), eventId: String(eventId) },
      });
    } catch (err) {
      Alert.alert("Error", safeJsonString(err));
    }
  },
  [ensureLocation]
);

  // ── Continue session ─────────────────────────────────────────
  const continueSession = useCallback(
  async (event: AdminEvent) => {
    try {
      const eventId = Number(event.id);

      const status = deriveStatus(event);
      if (status !== "ongoing") {
  // ✅ remove submission-based keys
  await AsyncStorage.multiRemove([
    `${SUBMISSION_PREFIX}${eventId}`,
    `${PROG_SUBMISSION_PREFIX}${eventId}`,
    `${PROG_PREFIX}${eventId}`,
    `${SESSION_PREFIX}${eventId}`, // optional (safe cleanup)
  ]);

  Alert.alert(
    "Not available",
    "This activity can only be continued during the event time."
  );
  return;
}

      const stored = await AsyncStorage.getItem(`${SUBMISSION_PREFIX}${eventId}`);

      // ✅ stored is submissionId now
      if (stored) {
        router.push({
          pathname: "/(student)/activity-camera",
          params: { submissionId: String(stored), eventId: String(eventId) },
        });
        return;
      }

      await startSession(event);
    } catch (e) {
      Alert.alert("Error", safeJsonString(e));
    }
  },
  [startSession]
);

  const handleViewSubmission = useCallback((event: AdminEvent) => {
    router.push({
      pathname: "/(student)/activity-camera",
      params: {
        eventId: String(event.id),
        eventTitle: event.title,
        showCompleted: "1",
      },
    });
  }, []);

  // ✅ CERTIFICATE FIX: don’t hard-fail on 404. Check endpoints → if none, show friendly message.
  const handleCertificates = useCallback(
    async (event: AdminEvent) => {
      const eventId = Number(event?.id);
      if (!eventId) return;

      try {
        setCertLoading((p) => ({ ...p, [eventId]: true }));

        const certs = await fetchEventCertificates(eventId);

        if (!certs || certs.length === 0) {
          showToast("No certificates found for this event.", "warning");
          return;
        }

        // Navigate to certificates screen with prefetched certs (so your screen can render even if endpoint differs)
        router.push({
          pathname: "/(student)/certificates",
          params: {
            eventId: String(eventId),
            eventTitle: event.title,
            // pass data as string for expo-router
            prefetched: JSON.stringify(certs),
          },
        });
      } catch (e: any) {
        showToast("Unable to load certificates.", "warning");
        Alert.alert("Error", safeJsonString(e));
      } finally {
        setCertLoading((p) => ({ ...p, [eventId]: false }));
      }
    },
    [showToast]
  );

  // ── Load all on focus ────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPersistedState(), fetchMe(), ensureFaceEnroll(), fetchStats(), fetchEvents()]);
    setLoading(false);
  }, [loadPersistedState, fetchMe, ensureFaceEnroll, fetchStats, fetchEvents]);

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
        Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(bodySlide, { toValue: 0, tension: 50, friction: 11, useNativeDriver: true }),
        Animated.timing(bodyAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [bodyAnim, bodySlide, headerAnim, headerSlide]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  // ── UI derived values ────────────────────────────────────────
const totalPts = Number(me?.total_points_earned ?? stats.total_points ?? 0) || 0;
const nextMilestone = Number(me?.required_total_points ?? stats.next_milestone ?? 0) || 0;

  const progress = useMemo(() => {
    if (!nextMilestone || nextMilestone <= 0) return 0;
    return Math.max(0, Math.min(1, totalPts / nextMilestone));
  }, [totalPts, nextMilestone]);

 const filteredEvents = events.filter((e) => {
  const s2 = deriveStatus(e);
  return activeEventTab === "Upcoming"
    ? s2 === "upcoming"
    : activeEventTab === "Ongoing"
    ? s2 === "ongoing"
    : s2 === "past";
});

  const countFor = (tab: EventTab) =>
    events.filter((e) => deriveStatus(e) === (tab === "Upcoming" ? "upcoming" : tab === "Ongoing" ? "ongoing" : "past"))
      .length;

  const studentName = (me?.name ?? "").trim() || "Student";
  const studentInitials = initialsFromName(me?.name);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {toast && (
        <Animated.View
          style={[
            s.toast,
            { transform: [{ translateY: toastAnim }] },
            toast.type === "success" ? s.toastSuccess : s.toastWarning,
          ]}
        >
          {toast.type === "success" ? (
            <CheckCircle size={16} color={C.white} strokeWidth={2.5} />
          ) : (
            <AlertCircle size={16} color={C.white} strokeWidth={2.5} />
          )}
          <Text style={s.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={C.white} colors={[C.navy]} />
        }
      >
        {/* Header */}
        <Animated.View style={[s.topBar, { opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
          <View style={s.decor1} />
          <View style={s.decor2} />

          <View style={s.navRow}>
            <View style={s.brandRow}>
  <View style={s.logoBox}>
    <Image
      source={VikasanaLogo}
      style={{ width: 26, height: 26 }}
      resizeMode="contain"
    />
  </View>

  <View>
    <Text style={s.brandName}>Vikasana Foundation</Text>
    <Text style={s.brandTagline}>EMPOWERING COMMUNITIES</Text>
  </View>
</View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={s.bellBtn} onPress={() => router.push("/(student)/history")} activeOpacity={0.85}>
                <FileText size={20} color="#8ab4d9" strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity style={s.bellBtn} onPress={refreshAll} activeOpacity={0.85}>
                <Bell size={20} color="#8ab4d9" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.profileRow}>
            <View style={s.avatar}>
  <User size={22} color="#FFFFFF" strokeWidth={2.5} />
</View>

            <View style={{ flex: 1 }}>
              <Text style={s.greeting} numberOfLines={1}>
                Hello, {studentName}.
              </Text>
              <Text style={s.college} numberOfLines={1}>
                Social Activity Tracker
              </Text>
            </View>

            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>STUDENT</Text>
            </View>
          </View>

          <View style={s.tagRow}>
            <View style={s.tag}>
              <Text style={s.tagText}>AICTE · VTU</Text>
            </View>
            <View style={s.tag}>
              <Text style={s.tagText}>Vikasana</Text>
            </View>
          </View>
        </Animated.View>

        {/* Body */}
        <Animated.View style={[{ backgroundColor: C.bg }, { opacity: bodyAnim, transform: [{ translateY: bodySlide }] }]}>
          {/* Points card */}
          <View style={s.section}>
            <View style={s.pointsCard}>
              <View style={s.pointsHeader}>
                <View style={s.trophyCircle}>
                  <Award size={24} color={C.gold} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pointsLabel}>Total Activity Points</Text>
                  <Text style={s.pointsValue}>
                    {totalPts} <Text style={s.pointsUnit}>pts</Text>
                  </Text>
                </View>
                <View style={s.rankBadge}>
                  <Star size={12} color={C.gold} strokeWidth={2} />
                  <Text style={s.rankText}>Rank #{stats.rank ?? 0}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />

              <View style={s.progressRow}>
                <Text style={s.milestoneLabel}>Next Milestone</Text>
                <Text style={s.milestoneValue}>{nextMilestone || 0} pts</Text>
              </View>

              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>

              <View style={s.progressFooter}>
                <Text style={s.progressPercent}>{Math.round(progress * 100)}% complete</Text>
                <Text style={s.progressRemain}>{Math.max(0, (nextMilestone || 0) - totalPts)} pts remaining</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={[s.section, { paddingTop: 0 }]}>
            <View style={s.statsRow}>
              {(
                [
                  { label: "Submitted", value: String(stats.total ?? 0), color: C.navy, Icon: FileText },
                  { label: "Approved", value: String(stats.approved ?? 0), color: C.success, Icon: CheckCircle },
                  { label: "Pending", value: String(stats.pending ?? 0), color: C.warning, Icon: Clock },
                  { label: "Rejected", value: String(stats.rejected ?? 0), color: C.error, Icon: XCircle },
                ] as const
              ).map(({ label, value, color, Icon }) => (
                <View key={label} style={[s.statCard, { borderTopColor: color }]}>
                  <Icon size={16} color={color} strokeWidth={2} />
                  <Text style={[s.statValue, { color }]}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Explore header */}
          <View style={s.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Explore Activities</Text>
              <Text style={s.sectionSub}>Register and earn points.</Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={refreshAll}>
              <RefreshCw size={15} color={C.navyMid} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.eventTabsWrap}>
            {EVENT_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[s.eventTab, activeEventTab === tab && s.eventTabActive]}
                onPress={() => setActiveEventTab(tab)}
              >
                {tab === "Ongoing" && <View style={s.livePip} />}
                <Text style={[s.eventTabText, activeEventTab === tab && s.eventTabTextActive]}>{tab}</Text>
                <View style={[s.eventTabCount, activeEventTab === tab && s.eventTabCountActive]}>
                  <Text style={[s.eventTabCountText, activeEventTab === tab && { color: C.white }]}>
                    {loading ? "–" : countFor(tab)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <DotStrip />

          {/* Events list */}
          <View style={[s.section, { paddingTop: 0 }]}>
            {loading || eventsLoading ? (
              <View style={s.centreBox}>
                <ActivityIndicator size="large" color={C.navy} />
                <Text style={s.centreText}>Loading activities.</Text>
              </View>
            ) : error ? (
              <View style={s.centreBox}>
                <View style={s.errorIconWrap}>
                  <AlertCircle size={32} color={C.error} strokeWidth={2} />
                </View>
                <Text style={s.errorText}>{error}</Text>
                <TouchableOpacity style={s.retryBtn} onPress={refreshAll}>
                  <RefreshCw size={14} color={C.white} strokeWidth={2.5} />
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredEvents.length === 0 ? (
              <View style={s.centreBox}>
                <Calendar size={44} color={C.sage} strokeWidth={1.5} />
                <Text style={s.centreText}>No {activeEventTab.toLowerCase()} activities.</Text>
                <Text style={s.centreSub}>Pull down to refresh.</Text>
              </View>
            ) : (
              filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  regStatus={registrations[event.id] ?? "none"}
                  isInProgress={!!inProgress[event.id]}
                  isDone={!!done[event.id]}
                  onRegister={() => handleRegister(event)}
                  onStart={() => startSession(event)}
                  onContinue={() => continueSession(event)}
                  
                  onCertificates={() => handleCertificates(event)}
                  certificatesLoading={!!certLoading[event.id]}
                />
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged) ───────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },

  toast: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  toastSuccess: { backgroundColor: "#15803D" },
  toastWarning: { backgroundColor: C.warning },
  toastText: { color: C.white, fontSize: 13, fontWeight: "600", flex: 1 },

  topBar: { backgroundColor: C.navy, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, overflow: "hidden" },
  decor1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: C.navyLight,
    opacity: 0.1,
  },
  decor2: {
    position: "absolute",
    bottom: -10,
    right: 60,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.gold,
    opacity: 0.08,
  },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.navyMid,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoText: { color: C.white, fontWeight: "800", fontSize: 15 },
  brandName: { color: C.white, fontWeight: "700", fontSize: 13 },
  brandTagline: { color: "#7baad4", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 1 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.navyMid,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
  },
  avatarText: { color: C.white, fontWeight: "800", fontSize: 17 },
  greeting: { color: C.white, fontSize: 18, fontWeight: "800" },
  college: { color: "#7baad4", fontSize: 11, marginTop: 2 },

  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(201,149,42,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.35)",
  },
  roleBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  tagRow: { flexDirection: "row", gap: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tagText: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: C.ink },
  sectionSub: { fontSize: 12, color: C.muted, fontWeight: "500", marginTop: 2 },

  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },

  pointsCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  pointsHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  trophyCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" },
  pointsLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  pointsValue: { fontSize: 28, fontWeight: "800", color: C.ink },
  pointsUnit: { fontSize: 15, fontWeight: "500", color: C.muted },

  rankBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  rankText: { fontSize: 11, fontWeight: "700", color: C.gold },

  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  milestoneLabel: { fontSize: 12, color: C.muted, fontWeight: "500" },
  milestoneValue: { fontSize: 13, fontWeight: "700", color: C.navy },
  progressBar: { height: 8, backgroundColor: C.sageLight, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.navy, borderRadius: 4 },
  progressFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressPercent: { fontSize: 11, color: C.navy, fontWeight: "700" },
  progressRemain: { fontSize: 11, color: C.muted, fontWeight: "500" },

  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: "600", textAlign: "center" },

  eventTabsWrap: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  eventTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 5,
  },
  eventTabActive: { backgroundColor: C.navy, borderColor: C.navy },
  eventTabText: { fontSize: 12, fontWeight: "600", color: C.muted },
  eventTabTextActive: { color: C.white, fontWeight: "700" },
  eventTabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  eventTabCountActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  eventTabCountText: { fontSize: 10, fontWeight: "700", color: C.navyMid },
  livePip: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.success },

  centreBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  centreText: { color: C.muted, fontSize: 15, fontWeight: "600" },
  centreSub: { color: C.muted, fontSize: 12, opacity: 0.7 },

  errorIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },
  errorText: { color: C.error, fontSize: 14, fontWeight: "600", textAlign: "center", paddingHorizontal: 24 },

  retryBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.navy, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  retryBtnText: { color: C.white, fontSize: 13, fontWeight: "700" },
});

const ec = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  thumbWrap: { position: "relative", height: 180 },
  thumb: { width: "100%", height: "100%" },
  thumbAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  liveChip: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22,163,74,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.white },
  liveText: { color: C.white, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  thumbCatWrap: { position: "absolute", bottom: 12, left: 12 },
  ptsOnThumb: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(11,45,107,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ptsOnThumbText: { color: C.white, fontSize: 12, fontWeight: "800" },
  fallbackBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.sageLight,
    borderTopWidth: 4,
  },
  liveChipSmall: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.success + "DD", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },

  body: { padding: 16 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: "800", color: C.ink, flex: 1 },
  countBadge: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EBF1FB",
    borderWidth: 1,
    borderColor: C.sage,
    minWidth: 52,
  },
  countDays: { fontSize: 18, fontWeight: "800", color: C.navy, lineHeight: 20 },
  countLabel: { fontSize: 9, color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  desc: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 12 },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: "45%" },
  metaText: { fontSize: 12, color: C.muted, fontWeight: "500", flex: 1 },

  fillBar: { height: 6, backgroundColor: C.sageLight, borderRadius: 3, overflow: "hidden" },
  fillFill: { height: "100%", borderRadius: 3 },
  fillLabel: { fontSize: 10, color: C.muted, fontWeight: "600" },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 10 },

  registerBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: C.navy },
  disabledBtn: { backgroundColor: C.border },
  registerBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  regBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  regText: { fontSize: 12, fontWeight: "700", color: C.success },

  startBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: C.success },
  startText: { fontSize: 13, fontWeight: "700", color: C.white },

  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: C.navyMid },
  primaryBtnText: { fontSize: 13, fontWeight: "800", color: C.white },

  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.success,
    borderWidth: 1,
    borderColor: C.success,
    opacity: 0.85,
  },
  doneText: { fontSize: 13, fontWeight: "800", color: C.white },
});