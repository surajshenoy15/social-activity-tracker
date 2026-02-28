// app/(student)/history-details.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Calendar, MapPin, FileText } from "lucide-react-native";

const BASE_URL = "http://31.97.230.171:8000/api";

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
  border: "#E2E8F0",
  error: "#DC2626",
};

function formatDate(d?: string): string {
  if (!d) return "TBD";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

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

export default function HistoryDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch event from DB WITH TOKEN
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await authFetch(`/student/events/${eventId}`, { method: "GET" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : `Failed to fetch event details (${res.status})`;
          throw new Error(msg);
        }

        setEvent(data);
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const activityTitle =
    event?.title?.trim() || `Activity #${eventId ?? ""}` || "Activity";

  const dateText = useMemo(() => formatDate(event?.event_date), [event?.event_date]);

  // ✅ DB fields (as you requested)
  const locationText =
    (event?.venue_name ?? event?.location ?? "").trim() || "Not provided";

  const mapsUrl =
    (event?.maps_url ?? event?.mapsUrl ?? "").trim() || "";

  const descriptionText =
    (event?.description ?? "").trim() || "No description provided";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <ArrowLeft size={18} color={C.white} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={s.title}>Activity Details</Text>
          <Text style={s.subTitle} numberOfLines={1}>
            View your submitted activity
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={C.navyMid} />
            <Text style={s.centerText}>Loading details…</Text>
          </View>
        ) : error ? (
          <View style={s.centerBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle} numberOfLines={2}>
              {activityTitle}
            </Text>

            <View style={s.row}>
              <Calendar size={14} color={C.navyMid} strokeWidth={2} />
              <Text style={s.rowText}>{dateText}</Text>
            </View>

            <View style={s.row}>
              <MapPin size={14} color={C.navyMid} strokeWidth={2} />
              <Text style={s.rowText}>{locationText}</Text>
            </View>

            {mapsUrl ? (
              <TouchableOpacity
                style={s.mapBtn}
                onPress={() => Linking.openURL(mapsUrl)}
                activeOpacity={0.85}
              >
                <Text style={s.mapBtnText}>Open in Google Maps</Text>
              </TouchableOpacity>
            ) : null}

            <View style={s.divider} />

            <View style={s.descRow}>
              <FileText size={14} color={C.navyMid} strokeWidth={2} />
              <Text style={s.descTitle}>Description</Text>
            </View>

            <Text style={s.desc}>{descriptionText}</Text>
          </View>
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
  errorText: { color: C.error, fontSize: 14, fontWeight: "800", textAlign: "center", paddingHorizontal: 18 },

  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: C.ink, marginBottom: 12 },

  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  rowText: { fontSize: 12.5, color: C.muted, fontWeight: "700", flex: 1 },

  mapBtn: {
    marginTop: 12,
    backgroundColor: C.navyMid,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  mapBtnText: { color: C.white, fontWeight: "800", fontSize: 12 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  descRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  descTitle: { fontSize: 13, fontWeight: "900", color: C.ink },
  desc: { fontSize: 12.5, color: C.muted, lineHeight: 19, fontWeight: "600" },
});