import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CheckCircle,
  RefreshCw,
  Camera,
  Upload,
  ArrowLeft,
  ShieldCheck,
  Scan,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const BASE_URL = "http://31.97.230.171:8000/api";
const TARGET_COUNT = 5;

// ── Brand tokens (Vikasana) ──────────────────────────────────────────────────
const C = {
  navy: "#0B1736",
  navyMid: "#122054",
  navyLight: "#1C3275",
  gold: "#F5A623",
  goldDim: "#D4881B",
  white: "#FFFFFF",
  offWhite: "#E8EDF8",
  muted: "#8A9BC5",
  success: "#22C55E",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.12)",
};

type StepPrompt = { title: string; subtitle: string };
const STEPS: StepPrompt[] = [
  { title: "Look Straight", subtitle: "Hold phone at eye level, face centered." },
  { title: "Turn Slightly Left", subtitle: "Small left turn, keep face in frame." },
  { title: "Turn Slightly Right", subtitle: "Small right turn, stay centered." },
  { title: "Tilt Chin Up", subtitle: "Chin slightly up, avoid glare." },
  { title: "Tilt Chin Down", subtitle: "Chin slightly down, stay centered." },
];

export default function FaceEnrollScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [studentId, setStudentId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [captures, setCaptures] = useState<string[]>(Array(TARGET_COUNT).fill(""));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const progress = useMemo(
    () => captures.filter((u) => !!u).length,
    [captures]
  );

  // Active step should be stable for prompts + capture target
  const activeIndex = useMemo(() => {
    // If all done, keep last index for display
    if (progress >= TARGET_COUNT) return TARGET_COUNT - 1;

    // If current step points to an empty slot, keep it
    if (step >= 0 && step < TARGET_COUNT && !captures[step]) return step;

    // Otherwise move to first empty slot
    const firstEmpty = captures.findIndex((u) => !u);
    return firstEmpty === -1 ? TARGET_COUNT - 1 : firstEmpty;
  }, [step, progress, captures]);

  const prompt = useMemo(
    () => STEPS[Math.min(activeIndex, STEPS.length - 1)],
    [activeIndex]
  );

  const canSubmit = progress === TARGET_COUNT && !!studentId;

  // Load student_id and token
  useEffect(() => {
    (async () => {
      const sid = await AsyncStorage.getItem("student_id");
      const t = await AsyncStorage.getItem("token"); // you store token as "token" in login
      if (!sid) {
        Alert.alert("Session missing", "Student ID not found. Please login again.");
        router.replace("/student-login");
        return;
      }
      setStudentId(Number(sid));
      setToken(t);
    })();
  }, []);

  // Request permission once (avoid loop spam)
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted]);

  const takePhoto = async () => {
    try {
      if (!cameraRef.current) return;
      if (activeIndex < 0 || activeIndex >= TARGET_COUNT) return;

      setBusy(true);

      // @ts-ignore
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("No photo uri");

      setCaptures((prev) => {
        const next = [...prev];
        next[activeIndex] = photo.uri;
        return next;
      });

      // Move step forward, but keep it inside bounds
      setStep((s) => Math.min(Math.max(s + 1, 0), TARGET_COUNT - 1));
    } catch (e: any) {
      Alert.alert("Camera error", e?.message || "Failed to take photo");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!studentId || !canSubmit) return;

    setBusy(true);
    try {
      const form = new FormData();

      for (let i = 0; i < TARGET_COUNT; i++) {
        const uri = captures[i];
        if (!uri) throw new Error("Missing one or more selfies. Please capture all 5.");

        form.append("images", {
          uri,
          name: `selfie_${i + 1}.jpg`,
          type: "image/jpeg",
        } as any);
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/face/enroll/${studentId}`, {
        method: "POST",
        body: form,
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Enrollment failed");

      // Confirm from backend (recommended)
      if (token) {
        const meRes = await fetch(`${BASE_URL}/students/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = await meRes.json().catch(() => ({}));
        if (meRes.ok && me?.face_enrolled === true) {
          await AsyncStorage.setItem("face_enrolled", "true");
        } else {
          // fallback: still mark locally so app can proceed
          await AsyncStorage.setItem("face_enrolled", "true");
        }
      } else {
        await AsyncStorage.setItem("face_enrolled", "true");
      }

      Alert.alert("Face Enrolled", "You're all set!");
      router.replace("/(student)/dashboard");
    } catch (e: any) {
      Alert.alert("Upload error", e?.message || "Failed to enroll face");
    } finally {
      setBusy(false);
    }
  };

  // ── Permission screen ────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <LinearGradient colors={[C.navy, C.navyMid]} style={styles.fill}>
        <SafeAreaView style={styles.centerSafe}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={32} color={C.gold} />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSub}>
            We need your camera to capture selfies for secure face enrollment.
          </Text>
          <TouchableOpacity style={styles.goldBtn} onPress={requestPermission}>
            <Text style={styles.goldBtnTxt}>Allow Camera</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Step dots ────────────────────────────────────────────────────────────
  const StepDots = () => (
    <View style={styles.dotsRow}>
      {Array.from({ length: TARGET_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < progress
              ? styles.dotDone
              : i === progress
              ? styles.dotActive
              : styles.dotIdle,
          ]}
        />
      ))}
    </View>
  );

  return (
    <LinearGradient colors={[C.navy, C.navyMid, "#0D1F4A"]} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={18} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.hTitle}>Face Enrollment</Text>
            <Text style={styles.hSub}>5 quick selfies to verify your identity</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeTxt}>
              {progress}/{TARGET_COUNT}
            </Text>
          </View>
        </View>

        {/* ── Step dots ── */}
        <StepDots />

        {/* ── Camera ── */}
        <View style={styles.cameraCard}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
          />

          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Scan icon overlay */}
          <View style={styles.scanOverlay}>
            <Scan size={22} color={C.gold} />
          </View>

          {/* Prompt pill at bottom */}
          <LinearGradient
            colors={["transparent", "rgba(11,23,54,0.88)"]}
            style={styles.promptGrad}
          >
            <View style={styles.promptInner}>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillTxt}>
                  Step {Math.min(progress + 1, TARGET_COUNT)} of {TARGET_COUNT}
                </Text>
              </View>

              <Text style={styles.promptTitle}>
                {progress < TARGET_COUNT ? prompt.title : "All Done!"}
              </Text>
              <Text style={styles.promptSub}>
                {progress < TARGET_COUNT
                  ? prompt.subtitle
                  : "Tap Upload to complete enrollment."}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Thumbnails ── */}
        <View style={styles.thumbRow}>
          {Array.from({ length: TARGET_COUNT }).map((_, i) => {
            const uri = captures[i];
            const isNext = i === captures.findIndex((u) => !u); // first empty slot
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.thumb,
                  uri
                    ? styles.thumbDone
                    : isNext
                    ? styles.thumbActive
                    : styles.thumbIdle,
                ]}
                onPress={() => setStep(i)}
                activeOpacity={0.8}
              >
                {uri ? (
                  <>
                    <Image source={{ uri }} style={styles.thumbImg} />
                    <View style={styles.thumbCheck}>
                      <CheckCircle size={12} color={C.success} fill={C.navy} />
                    </View>
                  </>
                ) : (
                  <Text style={[styles.thumbNum, isNext && { color: C.gold }]}>
                    {i + 1}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          {!canSubmit ? (
            <TouchableOpacity
              style={styles.goldBtn}
              onPress={takePhoto}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={C.navy} />
              ) : (
                <Camera size={18} color={C.navy} />
              )}
              <Text style={styles.goldBtnTxt}>
                {busy ? "Capturing…" : "Capture Selfie"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.goldBtn}
              onPress={submit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={C.navy} />
              ) : (
                <Upload size={18} color={C.navy} />
              )}
              <Text style={styles.goldBtnTxt}>
                {busy ? "Uploading…" : "Upload & Continue"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => {
              setCaptures(Array(TARGET_COUNT).fill(""));
              setStep(0);
            }}
            disabled={busy}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={C.muted} />
            <Text style={styles.ghostBtnTxt}>Reset All</Text>
          </TouchableOpacity>

          {canSubmit && (
            <View style={styles.allDoneRow}>
              <CheckCircle size={16} color={C.success} />
              <Text style={styles.allDoneTxt}>
                All 5 selfies captured — ready to submit!
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const CAMERA_H = 310;
const CORNER_SIZE = 22;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerSafe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 14,
  },

  // Permission
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(245,166,35,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.3)",
  },
  permTitle: { fontSize: 20, fontWeight: "800", color: C.white, textAlign: "center" },
  permSub: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  hTitle: { fontSize: 16, fontWeight: "800", color: C.white },
  hSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.gold,
  },
  progressBadgeTxt: { color: C.navy, fontWeight: "800", fontSize: 12 },

  // Step dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  dot: { height: 4, borderRadius: 999 },
  dotIdle: { width: 20, backgroundColor: C.cardBorder },
  dotActive: { width: 28, backgroundColor: C.gold },
  dotDone: { width: 20, backgroundColor: C.success },

  // Camera
  cameraCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    height: CAMERA_H,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  scanOverlay: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(11,23,54,0.65)",
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.4)",
  },
  // Corner brackets
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: C.gold,
  },
  cornerTL: {
    top: 14,
    left: 14,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 14,
    right: 14,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 14,
    left: 14,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 14,
    right: 14,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: 6,
  },
  promptGrad: { position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 40 },
  promptInner: { padding: 14, gap: 4 },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245,166,35,0.2)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.5)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  stepPillTxt: { color: C.gold, fontSize: 10, fontWeight: "700" },
  promptTitle: { color: C.white, fontWeight: "800", fontSize: 15 },
  promptSub: { color: C.offWhite, fontSize: 12, opacity: 0.8 },

  // Thumbnails
  thumbRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  thumbIdle: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  thumbActive: {
    backgroundColor: "rgba(245,166,35,0.12)",
    borderWidth: 1.5,
    borderColor: C.gold,
  },
  thumbDone: {
    backgroundColor: C.navyLight,
    borderWidth: 1,
    borderColor: C.success,
  },
  thumbImg: { width: "100%", height: "100%", borderRadius: 14 },
  thumbCheck: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: C.navy,
    borderRadius: 99,
  },
  thumbNum: { fontWeight: "800", color: C.muted, fontSize: 14 },

  // Actions
  actions: { paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  goldBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  goldBtnTxt: { color: C.navy, fontWeight: "800", fontSize: 15 },
  ghostBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ghostBtnTxt: { color: C.muted, fontWeight: "700" },
  allDoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  allDoneTxt: { color: C.success, fontWeight: "700", fontSize: 13 },
});