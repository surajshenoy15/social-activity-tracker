// app/(student)/activity-camera.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Animated,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as ScreenOrientation from "expo-screen-orientation";
import { useLocalSearchParams, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Circle } from "react-native-maps";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Shield,
  Send,
  FileText,
  X,
  ChevronRight,
  Map,
} from "lucide-react-native";

// ─── Config ───────────────────────────────────────────────────
const BASE_URL = "http://31.97.230.171:8000/api";
const MAX_PHOTOS = 5;
const FRONT_CAM_COUNT = 2;

// ─── MinIO (optional) ─────────────────────────────────────────
const MINIO_PUBLIC_BASE = "http://31.97.230.171:9000";
const MINIO_FACE_BUCKET = "face-verification";

function buildMinioObjectUrl(objectKey?: string | null) {
  if (!objectKey) return null;
  return `${MINIO_PUBLIC_BASE}/${MINIO_FACE_BUCKET}/${objectKey}`;
}

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
  border: "#E2E8F0",
};

// ─── Types ────────────────────────────────────────────────────
interface CapturedPhoto {
  uri: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

type ScreenMode = "camera" | "map" | "description" | "submitting" | "confirmation";

// ─── Auth helper ──────────────────────────────────────────────
async function getToken(): Promise<string | null> {
  const directKeys = [
    "access_token",
    "accessToken",
    "token",
    "authToken",
    "auth_token",
    "userToken",
    "jwt",
  ];

  const normalize = (t?: any) => {
    if (!t) return null;
    if (typeof t !== "string") t = String(t);
    let s = t.trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).trim();
    }
    if (s.toLowerCase().startsWith("bearer ")) s = s.slice(7).trim();
    if (s.split(".").length >= 3) return s;
    return s.length > 20 ? s : null;
  };

  for (const k of directKeys) {
    const raw = await AsyncStorage.getItem(k);
    const token = normalize(raw);
    if (token) return token;
    if (raw && raw.trim().startsWith("{")) {
      try {
        const p = JSON.parse(raw);
        const t = p.access_token ?? p.accessToken ?? p.token ?? p.jwt;
        const token2 = normalize(t);
        if (token2) return token2;
      } catch {}
    }
  }

  for (const k of ["user", "auth", "session", "userData", "student", "profile"]) {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      const t =
        p.access_token ??
        p.accessToken ??
        p.token ??
        p.jwt ??
        p?.data?.access_token ??
        p?.data?.token ??
        p?.user?.access_token ??
        p?.student?.access_token;
      const token = normalize(t);
      if (token) return token;
    } catch {}
  }

  return null;
}

// ─── Active student id helper ──────────────────────────────────
async function getActiveStudentId(): Promise<string> {
  const existing = await AsyncStorage.getItem("active_student_id");
  if (existing && existing !== "0") return existing;

  const token = await getToken();
  if (!token) return "0";

  try {
    const candidates = [
      `${BASE_URL}/student/me`,
      `${BASE_URL}/students/me`,
      `${BASE_URL}/auth/me`,
    ];

    for (const url of candidates) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const id = data?.id ?? data?.student?.id ?? data?.user?.id;
        if (id != null) {
          await AsyncStorage.setItem("active_student_id", String(id));
          return String(id);
        }
      }
    }
  } catch {}

  return "0";
}

// ─── Face verification helper ─────────────────────────────────
async function verifyFaceForSession(submissionId: number, token?: string | null) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${BASE_URL}/face/verify-event-submission/${submissionId}`,
    { method: "POST", headers }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || `Face verification failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return {
    matched: Boolean(data?.matched),
    reason: (data?.reason as string | undefined) ?? undefined,
    cosine_score: (data?.cosine_score as number | undefined) ?? undefined,
    l2_score: (data?.l2_score as number | undefined) ?? undefined,
    total_faces: (data?.total_faces as number | undefined) ?? undefined,
    processed_object: (data?.processed_object as string | undefined) ?? undefined,
    boxedUrl: buildMinioObjectUrl(data?.processed_object),
    face_check_id: (data?.face_check_id as number | undefined) ?? undefined,
  };
}

// ─── Geo helpers ──────────────────────────────────────────────
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Photo counter dots ───────────────────────────────────────
function PhotoDots({ total, filled }: { total: number; filled: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i < filled ? 22 : 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i < filled ? C.gold : "rgba(255,255,255,0.25)",
            borderWidth: 1,
            borderColor: i < filled ? C.gold : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function ActivityCameraScreen() {
  const { eventId, eventTitle, sessionId, submissionId } = useLocalSearchParams<{
    eventId: string;
    eventTitle: string;
    sessionId?: string;
    submissionId?: string;
  }>();

  const cameraRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const [locGranted, setLocGranted] = useState(false);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsReady, setGpsReady] = useState(false);

  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [mode, setMode] = useState<ScreenMode>("camera");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [geo, setGeo] = useState<{
    maps_url?: string | null;
    target_lat?: number | null;
    target_lng?: number | null;
    radius_m?: number | null;
  } | null>(null);

  const [studentKey, setStudentKey] = useState<string>("0");
  const [createdSubmissionId, setCreatedSubmissionId] = useState<number | null>(null);
  const [creatingSubmission, setCreatingSubmission] = useState(false);

  const activeSubmissionId = useMemo(() => {
    const raw = submissionId ?? sessionId;
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [submissionId, sessionId]);

  const currentFacing: "front" | "back" =
    photos.length < FRONT_CAM_COUNT ? "front" : "back";
  const isFrontPhase = photos.length < FRONT_CAM_COUNT;
  const frontShotNum = photos.length + 1;
  const rearShotNum = photos.length - FRONT_CAM_COUNT + 1;
  const totalRear = MAX_PHOTOS - FRONT_CAM_COUNT;
  const isLastFrontShot = photos.length === FRONT_CAM_COUNT - 1;

  const subKey = useMemo(
    () => String(activeSubmissionId ?? createdSubmissionId ?? "0"),
    [activeSubmissionId, createdSubmissionId]
  );

  const k = useMemo(() => {
    return (raw: string) => `stu_${studentKey}_${raw}`;
  }, [studentKey]);

  const DRAFT_PHOTOS_KEY = useMemo(
    () => k(`draft_photos_${eventId}_${subKey}`),
    [k, eventId, subKey]
  );
  const DRAFT_DESC_KEY = useMemo(
    () => k(`draft_desc_${eventId}_${subKey}`),
    [k, eventId, subKey]
  );
  const PROG_KEY = useMemo(() => k(`prog_${eventId}`), [k, eventId]);
  const PROG_SUB_KEY = useMemo(() => k(`prog_sub_${eventId}`), [k, eventId]);
  const DONE_KEY = useMemo(() => k(`done_${eventId}`), [k, eventId]);

  // ─── Animations ───────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gpsAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.6)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const idleScale = useRef(new Animated.Value(1)).current;

  // ─── Helpers ──────────────────────────────────────────────
  const readJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  const fetchEventDraft = async (eid: number, token: string) => {
    const res = await fetch(`${BASE_URL}/student/events/${eid}/draft`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      const d = data?.detail;
      throw new Error(
        typeof d === "string" ? d : JSON.stringify(d) || `Draft fetch failed (${res.status})`
      );
    }
    return data;
  };

  const ensureSubmission = async (): Promise<number> => {
    const existing = activeSubmissionId ?? createdSubmissionId;
    if (existing) return existing;

    if (creatingSubmission) {
      await new Promise((r) => setTimeout(r, 250));
      const again = activeSubmissionId ?? createdSubmissionId;
      if (again) return again;
    }

    setCreatingSubmission(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please login again.");

      const eid = Number(eventId);
      if (!Number.isFinite(eid)) {
        throw new Error("Invalid event id. Please go back and start again.");
      }

      const draftData = await fetchEventDraft(eid, token).catch(() => null);
      if (draftData?.exists && draftData?.submission_id) {
        const sidNum = Number(draftData.submission_id);
        setCreatedSubmissionId(sidNum);
        return sidNum;
      }

      const regRes = await fetch(`${BASE_URL}/student/events/${eid}/register`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const regData = await readJsonSafe(regRes);

      if (!regRes.ok) {
        const d = regData?.detail;
        throw new Error(
          typeof d === "string"
            ? d
            : JSON.stringify(d) || `Create submission failed (${regRes.status})`
        );
      }

      const sid = regData?.submission_id;
      if (!sid) throw new Error("Submission created but id missing in response.");

      const sidNum = Number(sid);
      setCreatedSubmissionId(sidNum);
      return sidNum;
    } finally {
      setCreatingSubmission(false);
    }
  };

  // ─── FIXED: Photo Upload using FileSystem.uploadAsync ─────
  const uploadCapturedPhotoImmediately = async (
    submissionId: number,
    photo: CapturedPhoto,
    seqNo: number
  ) => {
    const token = await getToken();
    if (!token) throw new Error("Login required");

    const url = `${BASE_URL}/student/events/submissions/${submissionId}/photos?start_seq=${seqNo}`;

    console.log("UPLOAD URL =", url);
    console.log("PHOTO URI =", photo.uri);
    console.log("LAT =", photo.latitude);
    console.log("LNG =", photo.longitude);

    // FileSystem.uploadAsync is the only reliable way to upload
    // file:// URIs on Android in Expo Go
    const uploadResult = await FileSystem.uploadAsync(url, photo.uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART,
      fieldName: "photo",
      mimeType: "image/jpeg",
      parameters: {
        lat: String(photo.latitude ?? 0),
        lng: String(photo.longitude ?? 0),
      },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("UPLOAD STATUS =", uploadResult.status);
    console.log("UPLOAD RAW =", uploadResult.body);

    let data: any = {};
    try {
      data = uploadResult.body ? JSON.parse(uploadResult.body) : {};
    } catch {
      data = { raw: uploadResult.body };
    }

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(
        typeof data?.detail === "string"
          ? data.detail
          : JSON.stringify(data?.detail || data)
      );
    }

    return data;
  };

  // ─── Effects ──────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    ScreenOrientation.unlockAsync().catch(() => {});
    requestPermission();

    let sub: Location.LocationSubscription | undefined;

    (async () => {
      const sid = await getActiveStudentId();
      setStudentKey(sid);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocGranted(true);
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 500, distanceInterval: 0.5 },
          (loc) => {
            setLocation(loc.coords);
            setGpsAccuracy(loc.coords.accuracy ?? null);
            setGpsReady(true);
          }
        );
      } else {
        setLocGranted(false);
        setGpsReady(false);
      }

      try {
        await ensureSubmission();
      } catch (e: any) {
        setSubmitError(e?.message ?? "Submission not created. Please go back and start again.");
      }
    })();

    return () => {
      sub?.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!studentKey) return;

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const eid = Number(eventId);
        if (!Number.isFinite(eid)) return;

        const data = await fetchEventDraft(eid, token);

        if (data?.submission_id) {
          setCreatedSubmissionId(Number(data.submission_id));
        }

        const rawDesc = await AsyncStorage.getItem(DRAFT_DESC_KEY);
        if (rawDesc) setDescription(rawDesc);

        const rawPhotos = await AsyncStorage.getItem(DRAFT_PHOTOS_KEY);
        const savedPhotos: CapturedPhoto[] = rawPhotos ? JSON.parse(rawPhotos) : [];

        const uploadedSeqNos: number[] = Array.isArray(data?.uploaded_seq_nos)
          ? data.uploaded_seq_nos
              .map((x: any) => Number(x))
              .filter((n: number) => Number.isFinite(n))
          : [];

        if (savedPhotos.length > 0 && uploadedSeqNos.length > 0) {
          const restored = savedPhotos.filter((_, idx) => uploadedSeqNos.includes(idx + 1));
          setPhotos(restored);
          if (uploadedSeqNos.length >= MAX_PHOTOS) {
            setMode("description");
          }
        } else {
          setPhotos([]);
        }
      } catch (e) {
        console.log("draft restore failed", e);
      }
    })();
  }, [studentKey, eventId, DRAFT_PHOTOS_KEY, DRAFT_DESC_KEY]);

  useEffect(() => {
    if (gpsReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gpsAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(gpsAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [gpsReady, gpsAnim, pulseAnim]);

  useEffect(() => {
    if (mode === "confirmation") {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [mode, successScale, successOpacity]);

  // ─── GPS helpers ──────────────────────────────────────────
  const gpsStrength = () => {
    if (!gpsAccuracy) return "Acquiring";
    if (gpsAccuracy < 10) return "Excellent";
    if (gpsAccuracy < 20) return "Good";
    if (gpsAccuracy < 50) return "Fair";
    return "Weak";
  };

  const gpsColor = () => {
    if (!gpsAccuracy) return "#FCD34D";
    if (gpsAccuracy < 10) return "#10B981";
    if (gpsAccuracy < 20) return "#34D399";
    if (gpsAccuracy < 50) return "#FCD34D";
    return "#EF4444";
  };

  // ─── Capture ──────────────────────────────────────────────
  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    if (uploadingPhoto) return;

    if (locGranted && !location) {
      Alert.alert("GPS Required", "Waiting for GPS signal.");
      return;
    }

    if (photos.length >= MAX_PHOTOS) return;

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    try {
      setUploadingPhoto(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });

      await new Promise((r) => setTimeout(r, 400));

      const newPhoto: CapturedPhoto = {
        uri: photo.uri,
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        accuracy: gpsAccuracy,
        timestamp: new Date().toISOString(),
      };

      const nextSeqNo = photos.length + 1;
      const subId = await ensureSubmission();

      const updated = [...photos, newPhoto];
      setPhotos(updated);

      await AsyncStorage.setItem(DRAFT_PHOTOS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(DRAFT_DESC_KEY, description || "");
      await AsyncStorage.setItem(PROG_KEY, "in_progress");
      await AsyncStorage.setItem(PROG_SUB_KEY, String(subId));

      await uploadCapturedPhotoImmediately(subId, newPhoto, nextSeqNo);

      if (updated.length === MAX_PHOTOS) {
        setTimeout(() => setMode("description"), 600);
      }
    } catch (e: any) {
      Alert.alert("Upload Failed", e?.message || "Failed to capture/upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      AsyncStorage.setItem(DRAFT_PHOTOS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  // ─── Submit ───────────────────────────────────────────────
 const handleSubmit = async () => {
  setSubmitting(true);
  setSubmitError(null);
  setMode("submitting");

  try {
    const token = await getToken();
    if (!token) throw new Error("Please login again.");

    const subId = await ensureSubmission();
    if (!subId || Number.isNaN(subId)) {
      throw new Error("Submission not created. Please go back and start again.");
    }

    if (
      geo?.target_lat != null &&
      geo?.target_lng != null &&
      geo?.radius_m != null &&
      location
    ) {
      const dist = haversineMeters(
        location.latitude,
        location.longitude,
        geo.target_lat,
        geo.target_lng
      );
      if (dist > geo.radius_m) {
        throw new Error("You are outside the allowed area. Move closer and try again.");
      }
    }

    if (photos.length === 0) {
      throw new Error("Please capture at least 1 photo.");
    }

    // ✅ Submit directly — backend now runs face verification automatically
    const submitRes = await fetch(`${BASE_URL}/student/submissions/${subId}/submit`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: description?.trim() || "",
      }),
    });

    const submitJson = await readJsonSafe(submitRes);

    if (!submitRes.ok) {
      const d = submitJson?.detail ?? "Submit failed";
      throw new Error(typeof d === "string" ? d : JSON.stringify(d));
    }

    // ✅ Check if backend auto-approved (face matched) or pending review
    const submissionStatus = submitJson?.status ?? "submitted";
    const faceMatched = submissionStatus === "approved";

    // Clear all draft state
    await AsyncStorage.multiRemove([
      DRAFT_PHOTOS_KEY,
      DRAFT_DESC_KEY,
      PROG_KEY,
      PROG_SUB_KEY,
    ]);

    const sidRaw = await AsyncStorage.getItem("active_student_id");
    const sid =
      (sidRaw && sidRaw !== "0" ? sidRaw : null) ||
      (studentKey && studentKey !== "0" ? String(studentKey) : "0");

    await AsyncStorage.setItem(`stu_${sid}_done_${eventId}`, "done");
    await AsyncStorage.setItem(`stu_${sid}_reg_${eventId}`, faceMatched ? "approved" : "submitted");
    await AsyncStorage.setItem(`done_${eventId}`, "done");
    await AsyncStorage.setItem(`reg_${eventId}`, faceMatched ? "approved" : "submitted");
    await AsyncStorage.setItem(DONE_KEY, "done");

    setMode("confirmation");
  } catch (e: any) {
    setSubmitError(e?.message ?? "Something went wrong");
    setMode("description");
  } finally {
    setSubmitting(false);
  }
};

  // ─── Permission screen ────────────────────────────────────
  if (!permission || !permission.granted) {
    return (
      <View style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={s.permHeader}>
          <View style={s.permDecor} />
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.permHeaderTitle}>GPS Camera</Text>
        </View>
        <View style={s.permCard}>
          <View style={s.permIconCircle}>
            <Shield size={32} color={C.navy} strokeWidth={1.8} />
          </View>
          <Text style={s.permTitle}>Camera Permission Required</Text>
          <Text style={s.permDesc}>Camera access is required to capture proof photos.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Camera size={18} color={C.white} strokeWidth={2} />
            <Text style={s.permBtnText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Confirmation screen ──────────────────────────────────
  if (mode === "confirmation") {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.navy }]}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <ScrollView contentContainerStyle={cf.container} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              cf.circle,
              { transform: [{ scale: successScale }], opacity: successOpacity },
            ]}
          >
            <CheckCircle size={64} color={C.success} strokeWidth={1.5} />
          </Animated.View>

          <Animated.View style={{ opacity: successOpacity, alignItems: "center" }}>
            <Text style={cf.headline}>Activity Submitted</Text>
            <Text style={cf.subText}>
              Your activity is now under approval. You will be notified soon.
            </Text>

            <View style={cf.card}>
              <View style={cf.cardHeader}>
                <View style={cf.cardIconCircle}>
                  <FileText size={18} color={C.navy} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cf.cardTitle}>{eventTitle ?? "Activity"}</Text>
                  <Text style={cf.cardSub}>Submission Summary</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: C.border, marginVertical: 12 }} />

              {[
                { label: "Photos Uploaded", value: `${photos.length} of ${MAX_PHOTOS}` },
                { label: "GPS Stamped", value: locGranted ? "Yes" : "No" },
                { label: "Status", value: "Pending Review" },
                { label: "Points", value: "Awarded upon approval" },
              ].map((row) => (
                <View key={row.label} style={cf.row}>
                  <Text style={cf.rowLabel}>{row.label}</Text>
                  <Text style={cf.rowValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {location && (
              <View style={cf.mapCard}>
                <View style={cf.mapCardHeader}>
                  <Ionicons name="location" size={14} color={C.navy} />
                  <Text style={cf.mapCardTitle}>Submission Location</Text>
                </View>
                <MapView
                  style={cf.mapSnapshot}
                  initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
                    <View style={cf.markerDot}>
                      <View style={cf.markerInner} />
                    </View>
                  </Marker>
                  <Circle
                    center={{ latitude: location.latitude, longitude: location.longitude }}
                    radius={gpsAccuracy ?? 20}
                    fillColor="rgba(11,45,107,0.12)"
                    strokeColor="rgba(11,45,107,0.4)"
                    strokeWidth={1.5}
                  />
                </MapView>
                <View style={cf.mapCoords}>
                  <Ionicons name="navigate-outline" size={11} color={C.muted} />
                  <Text style={cf.mapCoordsText}>
                    {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
                    {gpsAccuracy ? `  ±${gpsAccuracy.toFixed(0)}m` : ""}
                  </Text>
                </View>
              </View>
            )}

            <View style={cf.statusPill}>
              <View style={cf.statusDot} />
              <Text style={cf.statusText}>Under Faculty Review</Text>
            </View>

            <Text style={cf.footNote}>
              You will receive a notification once your activity has been reviewed.
            </Text>

            <TouchableOpacity
              style={cf.homeBtn}
              onPress={() => router.replace("/(student)/dashboard")}
            >
              <Text style={cf.homeBtnText}>Back to Home</Text>
              <ChevronRight size={18} color={C.navy} strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Submitting screen ────────────────────────────────────
  if (mode === "submitting") {
    return (
      <View
        style={[
          s.safe,
          { justifyContent: "center", alignItems: "center", backgroundColor: C.navy },
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <View style={sub.box}>
          <View style={sub.spinner}>
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: pulseAnim.interpolate({
                      inputRange: [1, 1.1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <Send size={28} color={C.gold} strokeWidth={2} />
            </Animated.View>
          </View>
          <Text style={sub.title}>Submitting Activity</Text>
          <Text style={sub.sub}>
            Uploading {photos.length} photo{photos.length > 1 ? "s" : ""} with GPS data
          </Text>
          <View style={sub.bar}>
            <Animated.View style={[sub.barFill, { width: "70%" }]} />
          </View>
        </View>
      </View>
    );
  }

  // ─── Map screen ───────────────────────────────────────────
  if (mode === "map") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar barStyle="light-content" />

        {location ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.002,
              longitudeDelta: 0.002,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
          >
            <Marker
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              title="You are here"
              description={`±${gpsAccuracy?.toFixed(0) ?? "?"}m accuracy`}
            >
              <View style={ms.marker}>
                <View style={ms.markerPulse} />
                <View style={ms.markerCore} />
              </View>
            </Marker>

            <Circle
              center={{ latitude: location.latitude, longitude: location.longitude }}
              radius={gpsAccuracy ?? 20}
              fillColor="rgba(11,45,107,0.15)"
              strokeColor="rgba(11,45,107,0.5)"
              strokeWidth={2}
            />

            {photos.map((p, i) => (
              <Marker
                key={i}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={ms.photoMarker}>
                  <Image source={{ uri: p.uri }} style={ms.photoMarkerThumb} />
                  <View style={ms.photoMarkerBadge}>
                    <Text style={ms.photoMarkerBadgeText}>{i + 1}</Text>
                  </View>
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={ms.noLocContainer}>
            <Ionicons name="location-outline" size={48} color={C.muted} />
            <Text style={ms.noLocText}>Waiting for GPS signal</Text>
          </View>
        )}

        <View style={ms.header}>
          <BlurView intensity={85} tint="dark" style={ms.headerBlur}>
            <TouchableOpacity onPress={() => setMode("camera")} style={ms.backBtn}>
              <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={ms.headerTitle}>Live Location</Text>
              <Text style={ms.headerSub}>{eventTitle ?? "Activity"}</Text>
            </View>
            <View style={ms.gpsPill}>
              <View style={[ms.gpsDot, { backgroundColor: gpsColor() }]} />
              <Text style={ms.gpsPillText}>{gpsReady ? gpsStrength() : "Acquiring"}</Text>
            </View>
          </BlurView>
        </View>

        {location && (
          <View style={ms.coordsFooter}>
            <BlurView intensity={85} tint="dark" style={ms.coordsBlur}>
              <View style={ms.coordsRow}>
                <Ionicons name="location" size={14} color={C.gold} />
                <Text style={ms.coordsText}>
                  {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
                </Text>
                {gpsAccuracy != null && (
                  <View style={ms.accBadge}>
                    <Text style={ms.accText}>±{gpsAccuracy.toFixed(0)}m</Text>
                  </View>
                )}
              </View>

              {photos.length > 0 && (
                <View style={ms.photoCountRow}>
                  <Text style={ms.photoCountText}>
                    {photos.length} photo location{photos.length > 1 ? "s" : ""} pinned on map
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={ms.backToCameraBtn}
                onPress={() => setMode("camera")}
                activeOpacity={0.85}
              >
                <Camera size={16} color={C.white} strokeWidth={2.5} />
                <Text style={ms.backToCameraBtnText}>Back to Camera</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        )}
      </View>
    );
  }

  // ─── Description screen ───────────────────────────────────
  if (mode === "description") {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={ds.header}>
          <TouchableOpacity style={ds.backBtn} onPress={() => setMode("camera")}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ds.headerTitle}>Almost Done</Text>
            <Text style={ds.headerSub}>{eventTitle ?? "Activity"}</Text>
          </View>
          <View style={ds.photoBadge}>
            <Text style={ds.photoBadgeText}>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={ds.sectionLabel}>Captured Photos</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 24 }}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          >
            {photos.map((p, i) => (
              <View key={i} style={ds.thumbWrap}>
                <Image source={{ uri: p.uri }} style={ds.thumb} resizeMode="cover" />
                <View style={ds.thumbOverlay}>
                  <Text style={ds.thumbOverlayText}>
                    {i < FRONT_CAM_COUNT ? "Selfie" : "Scene"}
                  </Text>
                </View>
                <TouchableOpacity style={ds.thumbDelete} onPress={() => deletePhoto(i)}>
                  <X size={11} color={C.white} strokeWidth={3} />
                </TouchableOpacity>
                <View style={ds.thumbNum}>
                  <Text style={ds.thumbNumText}>{i + 1}</Text>
                </View>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={ds.addMoreBtn} onPress={() => setMode("camera")}>
                <Camera size={22} color={C.navyMid} strokeWidth={2} />
                <Text style={ds.addMoreText}>+{MAX_PHOTOS - photos.length} more</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {location && (
            <View style={ds.mapContainer}>
              <View style={ds.mapHeader}>
                <Ionicons name="location" size={13} color={C.navy} />
                <Text style={ds.mapHeaderText}>Capture Location</Text>
                <TouchableOpacity style={ds.mapExpandBtn} onPress={() => setMode("map")}>
                  <Map size={12} color={C.navyMid} strokeWidth={2} />
                  <Text style={ds.mapExpandText}>Expand</Text>
                </TouchableOpacity>
              </View>

              <MapView
                style={ds.miniMap}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.003,
                  longitudeDelta: 0.003,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                >
                  <View style={ds.markerDot}>
                    <View style={ds.markerInner} />
                  </View>
                </Marker>

                <Circle
                  center={{ latitude: location.latitude, longitude: location.longitude }}
                  radius={gpsAccuracy ?? 20}
                  fillColor="rgba(11,45,107,0.12)"
                  strokeColor="rgba(11,45,107,0.4)"
                  strokeWidth={1.5}
                />

                {photos.map((p, i) => (
                  <Marker
                    key={i}
                    coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={ds.miniPhotoMarker}>
                      <Text style={{ fontSize: 8, fontWeight: "800", color: C.white }}>
                        {i + 1}
                      </Text>
                    </View>
                  </Marker>
                ))}
              </MapView>

              <View style={ds.mapCoordsRow}>
                <Ionicons name="navigate-outline" size={11} color={C.muted} />
                <Text style={ds.mapCoordsText}>
                  {location.latitude.toFixed(5)}°, {location.longitude.toFixed(5)}°
                  {gpsAccuracy ? `  ±${gpsAccuracy.toFixed(0)}m` : ""}
                </Text>
              </View>
            </View>
          )}

          <Text style={ds.sectionLabel}>
            Description{" "}
            <Text style={{ color: C.muted, fontWeight: "400" }}>(Optional)</Text>
          </Text>

          <TextInput
            style={ds.input}
            multiline
            numberOfLines={5}
            placeholder="Describe what you did, key outcomes, takeaways."
            placeholderTextColor={C.muted}
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              AsyncStorage.setItem(DRAFT_DESC_KEY, t).catch(() => {});
            }}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={ds.charCount}>{description.length}/500</Text>

          {submitError && (
            <View style={ds.errorBox}>
              <Text style={ds.errorText}>{submitError}</Text>
            </View>
          )}

          <View style={ds.infoBox}>
            <Text style={ds.infoText}>
              Your submission will be reviewed by the faculty coordinator. You will be notified
              once approved and points are credited.
            </Text>
          </View>

          <TouchableOpacity
            style={[ds.submitBtn, photos.length === 0 && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={photos.length === 0 || submitting}
            activeOpacity={0.85}
          >
            <Send size={18} color={C.white} strokeWidth={2.5} />
            <Text style={ds.submitBtnText}>Submit Activity</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Camera screen ────────────────────────────────────────
  const photoCount = photos.length;
  const allDone = photoCount >= MAX_PHOTOS;

  return (
    <View style={s.cameraContainer}>
      <StatusBar barStyle="light-content" />
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing={currentFacing} />

      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#fff", opacity: flashAnim }]}
        pointerEvents="none"
      />

      <Animated.View style={[s.cameraHeader, { opacity: headerAnim }]}>
        <View style={s.camDecor} />
        <View style={s.camNavRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.camTitle} numberOfLines={1}>
              {eventTitle ?? "GPS Camera"}
            </Text>
            <Text style={s.camSub}>GPS-stamped proof photos</Text>
          </View>

          <TouchableOpacity
            style={s.mapHeaderBtn}
            onPress={() => setMode("map")}
            disabled={!locGranted}
          >
            <Map size={16} color={locGranted ? C.gold : C.muted} strokeWidth={2} />
            <Text style={[s.mapHeaderBtnText, !locGranted && { color: C.muted }]}>Map</Text>
          </TouchableOpacity>

          <View style={[s.aicteBadge, { marginLeft: 8 }]}>
            <Text style={s.aicteBadgeText}>AICTE</Text>
          </View>
        </View>
      </Animated.View>

      <View style={s.camSwitchBanner}>
        <BlurView intensity={80} tint="dark" style={s.camSwitchBlur}>
          <Text style={s.camSwitchText}>
            {isFrontPhase
              ? `Front Camera — Selfie ${frontShotNum} of ${FRONT_CAM_COUNT}`
              : `Rear Camera — Scene ${rearShotNum} of ${totalRear}`}
          </Text>

          {isLastFrontShot && (
            <View style={s.camSwitchPill}>
              <Text style={s.camSwitchPillText}>REAR NEXT</Text>
            </View>
          )}

          {photoCount === FRONT_CAM_COUNT && (
            <View style={[s.camSwitchPill, s.camSwitchPillActive]}>
              <Text style={s.camSwitchPillText}>SWITCHED</Text>
            </View>
          )}
        </BlurView>
      </View>

      <View style={s.gpsBar}>
        <BlurView intensity={80} tint="dark" style={s.gpsBlur}>
          <View style={s.gpsContent}>
            <Animated.View
              style={[
                s.gpsDot,
                {
                  backgroundColor: gpsColor(),
                  opacity: gpsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                  transform: [
                    {
                      scale: gpsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}
            />

            <View style={{ flex: 1 }}>
              <Text style={s.gpsLabel}>GPS SIGNAL</Text>
              <Text style={s.gpsValue}>
                {locGranted ? (gpsReady ? gpsStrength() : "Acquiring") : "Location denied"}
              </Text>
            </View>

            {gpsAccuracy != null && (
              <View style={s.accBadge}>
                <Text style={s.accText}>±{gpsAccuracy.toFixed(0)}m</Text>
              </View>
            )}
          </View>
        </BlurView>

        {location && (
          <BlurView intensity={80} tint="dark" style={s.coordsBar}>
            <Ionicons name="location-outline" size={13} color={C.gold} />
            <Text style={s.coordsBarText}>
              {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
            </Text>
            <TouchableOpacity style={s.miniMapBtn} onPress={() => setMode("map")}>
              <Map size={12} color={C.gold} strokeWidth={2} />
              <Text style={s.miniMapBtnText}>View Map</Text>
            </TouchableOpacity>
          </BlurView>
        )}

        {!locGranted && (
          <BlurView intensity={80} tint="dark" style={s.locDeniedBar}>
            <Ionicons name="warning-outline" size={13} color={C.gold} />
            <Text style={s.locDeniedText}>
              Location denied — photos may not be GPS-stamped
            </Text>
          </BlurView>
        )}

        {creatingSubmission && (
          <BlurView
            intensity={80}
            tint="dark"
            style={[s.locDeniedBar, { borderColor: "rgba(16,185,129,0.35)" }]}
          >
            <Ionicons name="time-outline" size={13} color={C.gold} />
            <Text style={s.locDeniedText}>Creating submission…</Text>
          </BlurView>
        )}
      </View>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={s.reticleWrap}>
          <View style={s.reticle}>
            {([s.tl, s.tr, s.bl, s.br] as any[]).map((c, i) => (
              <View key={i} style={[s.corner, c]} />
            ))}
          </View>
        </View>
      </View>

      <View style={s.progressStrip}>
        <BlurView intensity={75} tint="dark" style={s.progressBlur}>
          <Text style={s.progressLabel}>
            {allDone
              ? `All ${MAX_PHOTOS} photos captured`
              : `Photo ${photoCount + 1} of ${MAX_PHOTOS}`}
          </Text>
          <PhotoDots total={MAX_PHOTOS} filled={photoCount} />

          {photoCount > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
              contentContainerStyle={{ gap: 8, justifyContent: "center", flexGrow: 1 }}
            >
              {photos.map((p, i) => (
                <View key={i} style={s.miniThumbWrap}>
                  <Image source={{ uri: p.uri }} style={s.miniThumb} resizeMode="cover" />
                  <View style={s.miniThumbBadge}>
                    <Text style={s.miniThumbBadgeText}>{i + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {allDone && (
            <TouchableOpacity
              style={s.continueBtn}
              onPress={() => setMode("description")}
              activeOpacity={0.85}
            >
              <Text style={s.continueBtnText}>Add Description & Submit</Text>
              <ChevronRight size={16} color={C.white} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>

      {!allDone && (
        <View style={s.bottomBar}>
          <Animated.View
            style={[
              s.captureOuter,
              { transform: [{ scale: gpsReady ? pulseAnim : idleScale }] },
            ]}
          >
            <TouchableOpacity
              style={s.captureInner}
              onPress={capturePhoto}
              disabled={locGranted ? !gpsReady || uploadingPhoto : uploadingPhoto}
              activeOpacity={0.9}
            >
              <View
                style={[
                  s.captureCore,
                  locGranted && !gpsReady && s.captureCoreDisabled,
                ]}
              >
                <Camera
                  size={28}
                  color={locGranted && !gpsReady ? C.muted : C.navy}
                  strokeWidth={2}
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text style={s.captureHint}>
            {!locGranted
              ? `Tap to capture (${photoCount}/${MAX_PHOTOS}) — no GPS`
              : !gpsReady
              ? "Waiting for GPS lock"
              : `Tap to capture (${photoCount}/${MAX_PHOTOS})`}
          </Text>

          {photoCount > 0 && (
            <TouchableOpacity style={s.skipBtn} onPress={() => setMode("description")}>
              <Text style={s.skipBtnText}>Skip remaining</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  cameraContainer: { flex: 1, backgroundColor: "#000" },

  permHeader: {
    backgroundColor: C.navy,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  permDecor: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.navyLight,
    opacity: 0.12,
  },
  permCard: {
    margin: 20,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  permIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  permTitle: { fontSize: 20, fontWeight: "800", color: C.ink },
  permDesc: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 21 },
  permBtn: {
    backgroundColor: C.navy,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  permBtnText: { color: C.white, fontSize: 15, fontWeight: "700" },
  permHeaderTitle: { color: C.white, fontSize: 17, fontWeight: "800" },

  cameraHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(11,45,107,0.92)",
    paddingTop: Platform.OS === "ios" ? 54 : 42,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  camDecor: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.navyLight,
    opacity: 0.12,
  },
  camNavRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  camTitle: { color: C.white, fontSize: 15, fontWeight: "800" },
  camSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },
  aicteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(201,149,42,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.4)",
  },
  aicteBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  mapHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(201,149,42,0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.3)",
  },
  mapHeaderBtnText: { color: C.gold, fontSize: 11, fontWeight: "700" },

  camSwitchBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 104 : 92,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  camSwitchBlur: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  camSwitchText: { fontSize: 12, fontWeight: "700", color: C.white, flex: 1 },
  camSwitchPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(201,149,42,0.25)",
    borderWidth: 1,
    borderColor: C.gold,
  },
  camSwitchPillActive: { backgroundColor: "rgba(22,163,74,0.25)", borderColor: C.success },
  camSwitchPillText: { fontSize: 9, fontWeight: "800", color: C.gold, letterSpacing: 0.8 },

  gpsBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 168 : 156,
    left: 16,
    right: 16,
    gap: 8,
  },
  gpsBlur: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  gpsContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  gpsDot: { width: 11, height: 11, borderRadius: 5.5 },
  gpsLabel: { fontSize: 9, fontWeight: "700", color: "#10B981", letterSpacing: 1.2, marginBottom: 1 },
  gpsValue: { fontSize: 13, fontWeight: "600", color: C.white },
  accBadge: {
    backgroundColor: "rgba(16,185,129,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  accText: { fontSize: 12, fontWeight: "700", color: "#10B981" },
  coordsBar: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coordsBarText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.white,
    fontFamily: "monospace",
    flex: 1,
  },
  miniMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(201,149,42,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.3)",
  },
  miniMapBtnText: { fontSize: 10, fontWeight: "700", color: C.gold },
  locDeniedBar: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.4)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locDeniedText: { fontSize: 11, fontWeight: "600", color: C.gold, flex: 1 },

  reticleWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  reticle: { width: 210, height: 210, position: "relative" },
  corner: { position: "absolute", width: 32, height: 32, borderColor: C.gold, opacity: 0.85 },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  progressStrip: { position: "absolute", bottom: 120, left: 16, right: 16 },
  progressBlur: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 8,
  },
  progressLabel: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  miniThumbWrap: { position: "relative" },
  miniThumb: { width: 50, height: 50, borderRadius: 10, borderWidth: 2, borderColor: C.gold },
  miniThumbBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.navy,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.gold,
  },
  miniThumbBadgeText: { color: C.white, fontSize: 9, fontWeight: "800" },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.success,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  continueBtnText: { color: C.white, fontSize: 14, fontWeight: "800" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 44,
    gap: 10,
  },
  captureOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(201,149,42,0.22)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: C.gold,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  captureCore: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
  },
  captureCoreDisabled: { backgroundColor: "rgba(255,255,255,0.25)" },
  captureHint: {
    fontSize: 13,
    fontWeight: "600",
    color: C.white,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  skipBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
});

const ds = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    paddingTop: Platform.OS === "ios" ? 54 : 42,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },
  photoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(201,149,42,0.2)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.4)",
  },
  photoBadgeText: { color: C.gold, fontSize: 12, fontWeight: "700" },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: C.ink, marginBottom: 10 },
  thumbWrap: { position: "relative", width: 100, height: 100 },
  thumb: { width: 100, height: 100, borderRadius: 14, borderWidth: 2, borderColor: C.border },
  thumbOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(11,45,107,0.75)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 4,
    alignItems: "center",
  },
  thumbOverlayText: { color: C.gold, fontSize: 9, fontWeight: "700" },
  thumbDelete: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.error,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.white,
  },
  thumbNum: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.navy,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbNumText: { color: C.white, fontSize: 10, fontWeight: "800" },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.sage,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.sageLight,
  },
  addMoreText: { fontSize: 11, fontWeight: "700", color: C.navyMid },
  mapContainer: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapHeaderText: { fontSize: 12, fontWeight: "700", color: C.ink, flex: 1 },
  mapExpandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.sageLight,
    borderRadius: 8,
  },
  mapExpandText: { fontSize: 10, fontWeight: "700", color: C.navyMid },
  miniMap: { width: "100%", height: 160 },
  mapCoordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.sageLight,
  },
  mapCoordsText: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
    fontFamily: "monospace",
    flex: 1,
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.navy,
    borderWidth: 3,
    borderColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.white },
  miniPhotoMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.white,
  },
  input: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: C.ink,
    borderWidth: 1.5,
    borderColor: C.border,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: { fontSize: 11, color: C.muted, textAlign: "right", marginTop: 6, marginBottom: 16 },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: { color: C.error, fontSize: 13, fontWeight: "600" },
  infoBox: {
    backgroundColor: C.sageLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.sage,
  },
  infoText: { color: C.navyMid, fontSize: 13, lineHeight: 20, fontWeight: "500" },
  submitBtn: {
    backgroundColor: C.navy,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: "800" },
});

const sub = StyleSheet.create({
  box: { alignItems: "center", gap: 20, padding: 32 },
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(201,149,42,0.3)",
  },
  title: { color: C.white, fontSize: 20, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center" },
  bar: {
    width: 220,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: C.gold, borderRadius: 3 },
});

const cf = StyleSheet.create({
  container: { alignItems: "center", padding: 28, paddingTop: 48, paddingBottom: 60 },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(22,163,74,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 3,
    borderColor: "rgba(22,163,74,0.3)",
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    color: C.white,
    textAlign: "center",
    marginBottom: 12,
  },
  subText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 32,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  cardIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.ink },
  cardSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  rowLabel: { flex: 1, fontSize: 13, color: C.muted, fontWeight: "600" },
  rowValue: { fontSize: 13, fontWeight: "800", color: C.ink },
  mapCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  mapCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mapCardTitle: { fontSize: 12, fontWeight: "700", color: C.ink },
  mapSnapshot: { width: "100%", height: 160 },
  mapCoords: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.sageLight,
  },
  mapCoordsText: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
    fontFamily: "monospace",
    flex: 1,
  },
  markerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.navy,
    borderWidth: 3,
    borderColor: C.white,
    justifyContent: "center",
    alignItems: "center",
  },
  markerInner: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.white },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold },
  statusText: { color: C.white, fontSize: 13, fontWeight: "700" },
  footNote: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.white,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  homeBtnText: { color: C.navy, fontSize: 16, fontWeight: "800" },
});

const ms = StyleSheet.create({
  noLocContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  noLocText: { color: C.muted, fontSize: 15, fontWeight: "600" },
  header: { position: "absolute", top: 0, left: 0, right: 0 },
  headerBlur: {
    paddingTop: Platform.OS === "ios" ? 54 : 42,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: C.white, fontSize: 15, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsPillText: { fontSize: 11, fontWeight: "700", color: C.white },
  coordsFooter: { position: "absolute", bottom: 0, left: 0, right: 0 },
  coordsBlur: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 10,
  },
  coordsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  coordsText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.white,
    fontFamily: "monospace",
    flex: 1,
  },
  accBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(16,185,129,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  accText: { fontSize: 11, fontWeight: "700", color: "#10B981" },
  photoCountRow: { paddingHorizontal: 4 },
  photoCountText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  backToCameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.navy,
    paddingVertical: 14,
    borderRadius: 14,
  },
  backToCameraBtnText: { color: C.white, fontSize: 14, fontWeight: "800" },
  marker: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  markerPulse: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(11,45,107,0.25)",
    borderWidth: 1,
    borderColor: "rgba(11,45,107,0.5)",
  },
  markerCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.navy,
    borderWidth: 2.5,
    borderColor: C.white,
  },
  photoMarker: { position: "relative" },
  photoMarkerThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.gold,
  },
  photoMarkerBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.navy,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.gold,
  },
  photoMarkerBadgeText: { color: C.white, fontSize: 8, fontWeight: "800" },
});