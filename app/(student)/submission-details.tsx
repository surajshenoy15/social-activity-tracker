// app/(student)/submission-details.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Config (same as dashboard) ────────────────────────────────
const BASE_URL = "http://31.97.230.171:8000/api";

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

// ─── Types ────────────────────────────────────────────────────
type SubmissionSummary = {
  status: string;
  total_minutes?: number;
  total_hours?: number;
  points?: number;

  started_at?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;

  // optional extra fields (if backend returns)
  activity_name?: string;
  event_title?: string;
};

// ─── Helpers ──────────────────────────────────────────────────
const minutesToHrs = (mins?: number) => {
  const m = Number(mins || 0);
  const hrs = m / 60;
  return `${hrs.toFixed(1)} hrs`;
};

const formatMaybeDateTime = (v?: string) => {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString("en-IN");
  } catch {
    return v;
  }
};

const normStatus = (s?: string) => String(s || "SUBMITTED").toUpperCase();

const statusTone = (s: string) => {
  const st = normStatus(s);
  if (st === "APPROVED") return { bg: "#DCFCE7", bd: "#86EFAC", tx: "#166534" };
  if (st === "REJECTED") return { bg: "#FEE2E2", bd: "#FCA5A5", tx: "#991B1B" };
  if (st === "SUBMITTED") return { bg: "#DBEAFE", bd: "#93C5FD", tx: "#1D4ED8" };
  if (st === "IN_PROGRESS" || st === "INPROGRESS" || st === "DRAFT")
    return { bg: "#FEF3C7", bd: "#FCD34D", tx: "#92400E" };
  return { bg: "#E2E8F0", bd: "#CBD5E1", tx: "#334155" };
};

export default function SubmissionDetails() {
  const { eventId, sessionId } = useLocalSearchParams<{ eventId: string; sessionId: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubmissionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!sessionId) {
          throw new Error("Missing sessionId.");
        }

        // ✅ preferred endpoint (change if your backend differs)
        const res = await authFetch(`/student/activity/sessions/${sessionId}`, { method: "GET" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            typeof json?.detail === "string"
              ? json.detail
              : typeof json?.message === "string"
              ? json.message
              : "Failed to load submission details.";
          throw new Error(msg);
        }

        if (!mounted) return;

        const normalized: SubmissionSummary = {
          status: json.status ?? json.submission_status ?? "SUBMITTED",
          total_minutes: json.total_minutes ?? json.duration_minutes ?? json.worked_minutes,
          total_hours: json.total_hours ?? json.duration_hours,
          points: json.points ?? json.points_earned ?? json.activity_points,

          started_at: json.started_at,
          submitted_at: json.submitted_at,
          approved_at: json.approved_at,
          rejected_at: json.rejected_at,

          activity_name: json.activity_name ?? json.activity?.name,
          event_title: json.event_title ?? json.event?.title,
        };

        setData(normalized);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load submission details.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const durationText = useMemo(() => {
    if (!data) return "-";
    if (data.total_hours != null && !Number.isNaN(Number(data.total_hours))) {
      return `${Number(data.total_hours).toFixed(1)} hrs`;
    }
    return minutesToHrs(data.total_minutes);
  }, [data]);

  const points = useMemo(() => Number(data?.points ?? 0), [data]);
  const st = normStatus(data?.status);
  const tone = statusTone(st);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading submission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.err}>{error || "No data"}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const showContinue = st === "IN_PROGRESS" || st === "INPROGRESS" || st === "DRAFT";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Submission Details</Text>

        {!!(data.event_title || data.activity_name) && (
          <Text style={styles.subTitle} numberOfLines={2}>
            {(data.event_title || data.activity_name) as string}
          </Text>
        )}

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.bd }]}>
              <Text style={[styles.badgeText, { color: tone.tx }]}>{st.replace("_", " ")}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Total Duration</Text>
            <Text style={styles.value}>{durationText}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Points Earned</Text>
            <Text style={styles.value}>{points} pts</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Started At</Text>
            <Text style={styles.value}>{formatMaybeDateTime(data.started_at)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Submitted At</Text>
            <Text style={styles.value}>{formatMaybeDateTime(data.submitted_at)}</Text>
          </View>

          {st === "APPROVED" && (
            <View style={styles.row}>
              <Text style={styles.label}>Approved At</Text>
              <Text style={styles.value}>{formatMaybeDateTime(data.approved_at)}</Text>
            </View>
          )}

          {st === "REJECTED" && (
            <View style={styles.row}>
              <Text style={styles.label}>Rejected At</Text>
              <Text style={styles.value}>{formatMaybeDateTime(data.rejected_at)}</Text>
            </View>
          )}
        </View>

        {showContinue && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(student)/activity-camera",
                params: { sessionId: String(sessionId), eventId: String(eventId || "") },
              })
            }
            style={[styles.btn, { marginTop: 14 }]}
          >
            <Text style={styles.btnText}>Continue Activity</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.back()} style={[styles.btnGhost, { marginTop: 10 }]}>
          <Text style={styles.btnGhostText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8FC" },
  container: { padding: 16, paddingBottom: 40 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  muted: { marginTop: 10, opacity: 0.7 },
  err: { color: "#C0392B", textAlign: "center", marginBottom: 14 },

  title: { fontSize: 20, fontWeight: "800", marginBottom: 6, color: "#0F172A" },
  subTitle: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 12 },

  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  label: { fontSize: 14, fontWeight: "700", opacity: 0.7, color: "#0F172A" },
  value: { fontSize: 14, fontWeight: "800", color: "#0F172A", maxWidth: "60%", textAlign: "right" },

  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.08)" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "900" },

  btn: { backgroundColor: "#0B3A82", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },

  btnGhost: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(11,58,130,0.08)",
  },
  btnGhostText: { color: "#0B3A82", fontWeight: "800" },
});