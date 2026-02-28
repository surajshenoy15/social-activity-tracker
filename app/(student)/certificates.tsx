// app/(student)/certificates.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, Download, FileText, Calendar, Award } from "lucide-react-native";

const BASE_URL = "http://31.97.230.171:8000/api";

const C = {
  navy: "#0B2D6B",
  navyMid: "#1A47A0",
  sageLight: "#EBF1FB",
  white: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  gold: "#C9952A",
};

async function getToken(): Promise<string> {
  const t1 = await AsyncStorage.getItem("access_token");
  const t2 = await AsyncStorage.getItem("token");
  return t1 || t2 || "";
}

const authFetch = async (path: string, opts: RequestInit = {}) => {
  const token = await getToken();
  const headers: any = { Accept: "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { ...opts, headers });
};

type CertRow = {
  id: number;
  certificate_no: string;
  event_id: number;
  submission_id?: number;
  activity_type_id?: number | null;
  activity_type_name?: string;
  issued_at?: string;
  pdf_url?: string | null; // presigned GET url
};

function formatDate(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export default function CertificatesScreen() {
  const params = useLocalSearchParams();
  const eventId = Number(params?.eventId);

  const [rows, setRows] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => {
    if (params?.eventTitle) return String(params.eventTitle);
    return "Certificates";
  }, [params?.eventTitle]);

  const fetchRows = useCallback(async () => {
    try {
      if (!Number.isFinite(eventId) || eventId <= 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const res = await authFetch(`/student/events/${eventId}/certificates`, { method: "GET" });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        const msg = typeof data?.detail === "string" ? data.detail : "Failed to load certificates.";
        throw new Error(msg);
      }

      setRows(Array.isArray(data) ? (data as CertRow[]) : []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load certificates.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openPdf = useCallback(async (url?: string | null) => {
    try {
      if (!url) return;
      if (!String(url).startsWith("http")) throw new Error("Invalid certificate URL.");
      await WebBrowser.openBrowserAsync(String(url));
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unable to open certificate.");
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
          <ArrowLeft size={20} color={C.navy} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.hSub}>Download your certificates</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.navyMid} />
          <Text style={s.muted}>Loading certificates...</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={s.center}>
          <FileText size={40} color={C.border} strokeWidth={2} />
          <Text style={s.emptyTitle}>No certificates yet</Text>
          <Text style={s.muted}>Certificates are generated only after admin approves and ends the event.</Text>

          <TouchableOpacity style={s.retryBtn} onPress={fetchRows} activeOpacity={0.85}>
            <Text style={s.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {rows.map((c) => (
            <View key={c.id} style={s.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.certNo}>{c.certificate_no}</Text>

                  <View style={s.metaRow}>
                    <Award size={14} color={C.gold} strokeWidth={2.2} />
                    <Text style={s.metaText}>
                      {c.activity_type_name ??
                        (c.activity_type_id ? `Activity Type #${c.activity_type_id}` : "Social Activity")}
                    </Text>
                  </View>

                  {!!c.issued_at && (
                    <View style={s.metaRow}>
                      <Calendar size={14} color={C.navyMid} strokeWidth={2.2} />
                      <Text style={s.metaText}>Issued: {formatDate(c.issued_at)}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[s.btn, !c.pdf_url && { opacity: 0.55 }]}
                  onPress={() => openPdf(c.pdf_url)}
                  disabled={!c.pdf_url}
                  activeOpacity={0.85}
                >
                  <Download size={16} color={C.white} strokeWidth={2.5} />
                  <Text style={s.btnText}>{c.pdf_url ? "Open" : "N/A"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  hTitle: { fontSize: 16, fontWeight: "800", color: C.ink },
  hSub: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: "600" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.ink, marginTop: 6 },
  muted: { fontSize: 12, color: C.muted, textAlign: "center" },

  retryBtn: {
    marginTop: 10,
    backgroundColor: C.navyMid,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: C.white, fontSize: 12, fontWeight: "800" },

  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  certNo: { fontSize: 13, fontWeight: "900", color: C.navy },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  metaText: { fontSize: 12, color: C.muted, fontWeight: "600", flexShrink: 1 },

  btn: {
    backgroundColor: C.navyMid,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    alignSelf: "flex-start",
  },
  btnText: { color: C.white, fontSize: 12, fontWeight: "800" },
});