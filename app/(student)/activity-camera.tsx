import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Animated,
  Dimensions,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as ScreenOrientation from "expo-screen-orientation";
import { router } from "expo-router";
import { generateSessionCode } from "../../utils/sessionCode";
import { BlurView } from "expo-blur";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import {
  ArrowLeft, Camera, CheckCircle, XCircle, Shield,
  MapPin, RefreshCw,
} from "lucide-react-native";

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  navy:      "#0B2D6B",
  navyMid:   "#1A47A0",
  navyLight: "#3B6FD4",
  sage:      "#C7D8F5",
  gold:      "#C9952A",
  white:     "#FFFFFF",
  ink:       "#0F172A",
  muted:     "#64748B",
  bg:        "#F0F4FC",
  success:   "#16A34A",
  error:     "#DC2626",
};

export default function ActivityCameraScreen() {
  const cameraRef = useRef<any>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [capturedPhoto,   setCapturedPhoto]   = useState<any>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const [sessionCode] = useState(generateSessionCode("CLN"));

  // Animations
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const gpsSignalAnim = useRef(new Animated.Value(0)).current;
  const flashAnim    = useRef(new Animated.Value(0)).current;
  const headerAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    ScreenOrientation.unlockAsync();
    requestPermission();

    let sub: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setLocationPermission(true);
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 500, distanceInterval: 0.5 },
          (loc) => {
            setCurrentLocation(loc.coords);
            setGpsAccuracy(loc.coords.accuracy || null);
            setIsGettingLocation(false);
          }
        );
      } else { setLocationPermission(false); }
    })();

    return () => {
      sub?.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    if (!isGettingLocation && currentLocation) {
      Animated.loop(Animated.sequence([
        Animated.timing(gpsSignalAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(gpsSignalAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])).start();
    }
  }, [isGettingLocation, currentLocation]);

  useEffect(() => {
    if (!isGettingLocation) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])).start();
    }
  }, [isGettingLocation]);

  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    if (!currentLocation) { Alert.alert("GPS Signal Required", "Waiting for GPS signal…"); return; }

    try {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setCapturedPhoto({
        ...photo,
        latitude:  currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy:  gpsAccuracy,
        timestamp: new Date().toLocaleString(),
        sessionCode,
      });
    } catch { Alert.alert("Error", "Failed to capture photo"); }
  };

  const getGPSSignalStrength = () => {
    if (!gpsAccuracy) return "Acquiring…";
    if (gpsAccuracy < 10) return "Excellent";
    if (gpsAccuracy < 20) return "Good";
    if (gpsAccuracy < 50) return "Fair";
    return "Weak";
  };

  const getGPSColor = () => {
    if (!gpsAccuracy) return "#FCD34D";
    if (gpsAccuracy < 10) return "#10B981";
    if (gpsAccuracy < 20) return "#34D399";
    if (gpsAccuracy < 50) return "#FCD34D";
    return "#EF4444";
  };

  // ── Permission screens ─────────────────────────────────────
  if (!permission) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        <Text style={s.permText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted || !locationPermission) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" backgroundColor={C.navy} />
        {/* Navy header */}
        <View style={s.permHeader}>
          <View style={s.permDecor1} /><View style={s.permDecor2} />
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.permHeaderTitle}>GPS Camera</Text>
        </View>
        <View style={s.permCard}>
          <View style={s.permIconCircle}>
            <Shield size={32} color={C.navy} strokeWidth={1.8} />
          </View>
          <Text style={s.permTitle}>Permissions Required</Text>
          <Text style={s.permDesc}>Camera and Location access are required to capture GPS-stamped activity photos.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Camera size={18} color={C.white} strokeWidth={2} />
            <Text style={s.permBtnText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Preview (after capture) ───────────────────────────────
  if (capturedPhoto) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" />
        <Image source={{ uri: capturedPhoto.uri }} style={s.preview} />

        {/* Navy top bar overlay */}
        <Animated.View style={[s.previewTopBar, { opacity: headerAnim }]}>
          <View style={s.previewNavRow}>
            <View style={[s.sessionBadge]}>
              <Ionicons name="barcode-outline" size={14} color={C.gold} />
              <Text style={s.sessionLabel}>SESSION</Text>
              <Text style={s.sessionCode}>{capturedPhoto.sessionCode}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Metadata + map overlay */}
        <View style={[s.overlayContainer, isLandscape && s.overlayContainerLandscape]}>
          <View style={s.gradientOverlay} />
          <View style={[s.overlayContent, isLandscape && s.overlayContentLandscape]}>

            {/* Left — metadata */}
            <View style={[s.metaSection, isLandscape && s.metaSectionLandscape]}>
              {/* Timestamp card */}
              <View style={s.metaCard}>
                <View style={s.metaCardRow}>
                  <Ionicons name="time-outline" size={13} color={C.gold} />
                  <Text style={s.metaCardLabel}>CAPTURED</Text>
                </View>
                <Text style={[s.metaCardValue, isLandscape && { fontSize: 11 }]}>
                  {capturedPhoto.timestamp}
                </Text>
              </View>
              {/* Accuracy card */}
              <View style={s.metaCard}>
                <View style={s.metaCardRow}>
                  <Ionicons name="locate" size={13} color={C.gold} />
                  <Text style={s.metaCardLabel}>GPS ACCURACY</Text>
                </View>
                <Text style={[s.metaCardValue, isLandscape && { fontSize: 11 }]}>
                  ±{capturedPhoto.accuracy?.toFixed(1) || "N/A"}m
                </Text>
              </View>
            </View>

            {/* Right — map */}
            <View style={[s.mapSection, isLandscape && s.mapSectionLandscape]}>
              <View style={s.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={s.map}
                  initialRegion={{
                    latitude:  capturedPhoto.latitude,
                    longitude: capturedPhoto.longitude,
                    latitudeDelta:  0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false} zoomEnabled={false}
                  rotateEnabled={false} pitchEnabled={false}
                >
                  <Marker coordinate={{ latitude: capturedPhoto.latitude, longitude: capturedPhoto.longitude }}>
                    <View style={s.marker}>
                      <Ionicons name="location" size={32} color={C.gold} />
                    </View>
                  </Marker>
                </MapView>

                {/* Map header */}
                <View style={s.mapHeader}>
                  <MapPin size={12} color={C.gold} strokeWidth={2} />
                  <Text style={s.mapHeaderText}>GPS Location</Text>
                </View>

                {/* Coordinates */}
                <View style={s.coordsFooter}>
                  {[
                    { label: "LAT",  value: `${capturedPhoto.latitude.toFixed(6)}°` },
                    { label: "LONG", value: `${capturedPhoto.longitude.toFixed(6)}°` },
                  ].map(({ label, value }) => (
                    <View key={label} style={s.coordRow}>
                      <Text style={s.coordLabel}>{label}</Text>
                      <Text style={s.coordValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.retakeBtn} onPress={() => setCapturedPhoto(null)} activeOpacity={0.85}>
            <RefreshCw size={18} color={C.white} strokeWidth={2.5} />
            <Text style={s.actionBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmBtn} onPress={() => { Alert.alert("Success", "Photo saved!"); router.back(); }} activeOpacity={0.85}>
            <CheckCircle size={18} color={C.white} strokeWidth={2.5} />
            <Text style={s.actionBtnText}>Confirm & Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Live camera ─────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={s.camera} ref={cameraRef} facing="back" />

      {/* Flash */}
      <Animated.View style={[s.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />

      {/* ── Navy header bar — same design language as rest of app ── */}
      <Animated.View style={[s.cameraHeader, { opacity: headerAnim }]}>
        <View style={s.camHeaderDecor1} />
        <View style={s.camNavRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.camTitle}>GPS Camera</Text>
            <Text style={s.camSub}>Location auto-stamps on capture</Text>
          </View>
          <View style={s.aicteBadge}>
            <Text style={s.aicteBadgeText}>AICTE</Text>
          </View>
        </View>
      </Animated.View>

      {/* GPS status — below header */}
      <View style={s.gpsBar}>
        <BlurView intensity={80} tint="dark" style={s.gpsBlur}>
          <View style={s.gpsContent}>
            <Animated.View style={[s.gpsDot, {
              backgroundColor: getGPSColor(),
              opacity: gpsSignalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
              transform: [{ scale: gpsSignalAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
            }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.gpsLabel}>GPS SIGNAL</Text>
              <Text style={s.gpsValue}>{isGettingLocation ? "Acquiring…" : getGPSSignalStrength()}</Text>
            </View>
            {gpsAccuracy && (
              <View style={s.accBadge}>
                <Text style={s.accText}>±{gpsAccuracy.toFixed(0)}m</Text>
              </View>
            )}
          </View>
        </BlurView>

        {currentLocation && (
          <BlurView intensity={80} tint="dark" style={s.coordsBar}>
            <Ionicons name="location-outline" size={13} color={C.gold} />
            <Text style={s.coordsBarText}>
              {currentLocation.latitude.toFixed(6)}°, {currentLocation.longitude.toFixed(6)}°
            </Text>
          </BlurView>
        )}
      </View>

      {/* Reticle */}
      <View style={s.reticleContainer} pointerEvents="none">
        <View style={s.reticle}>
          {[s.tl, s.tr, s.bl, s.br].map((corner, i) => (
            <View key={i} style={[s.corner, corner]} />
          ))}
        </View>
      </View>

      {/* Capture button — Portrait */}
      {!isLandscape && (
        <View style={s.bottomBar}>
          <Animated.View style={[s.captureOuter, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={s.captureInner}
              onPress={capturePhoto}
              disabled={isGettingLocation}
              activeOpacity={0.9}
            >
              <View style={[s.captureCore, isGettingLocation && s.captureCoreDisabled]}>
                <Camera size={28} color={isGettingLocation ? C.muted : C.navy} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </Animated.View>
          <Text style={s.captureHint}>
            {isGettingLocation ? "Waiting for GPS…" : "Tap to capture"}
          </Text>
        </View>
      )}

      {/* Capture button — Landscape */}
      {isLandscape && (
        <View style={s.landscapeCapture}>
          <BlurView intensity={60} tint="dark" style={s.landscapeBlur}>
            <Animated.View style={[s.landscapeOuter, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity style={s.landscapeInner} onPress={capturePhoto} disabled={isGettingLocation} activeOpacity={0.9}>
                <View style={[s.landscapeCore, isGettingLocation && s.captureCoreDisabled]}>
                  <Camera size={40} color={isGettingLocation ? C.muted : C.navy} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const C_GPS = "#10B981"; // keep green for GPS indicators (camera context)

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera:    { flex: 1 },
  preview:   { flex: 1 },

  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff" },

  // Permission screen
  center:          { flex: 1, backgroundColor: C.bg },
  permHeader:      { backgroundColor: C.navy, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden", position: "relative" },
  permDecor1:      { position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: C.navyLight, opacity: 0.12 },
  permDecor2:      { position: "absolute", bottom: 0, right: 40, width: 60, height: 60, borderRadius: 30, backgroundColor: C.gold, opacity: 0.08 },
  permHeaderTitle: { color: C.white, fontSize: 17, fontWeight: "800" },
  permCard:   { margin: 20, backgroundColor: "#fff", borderRadius: 20, padding: 28, alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  permIconCircle: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#EBF1FB", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  permTitle:  { fontSize: 20, fontWeight: "800", color: C.ink },
  permDesc:   { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 21 },
  permBtn:    { backgroundColor: C.navy, paddingVertical: 15, paddingHorizontal: 28, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  permBtnText:{ color: C.white, fontSize: 15, fontWeight: "700" },
  permText:   { color: C.muted, fontSize: 14 },

  // Navy camera header
  cameraHeader: {
    position: "absolute", top: 0, left: 0, right: 0,
    backgroundColor: "rgba(11,45,107,0.92)",
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: 20,
    overflow: "hidden",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  camHeaderDecor1: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: C.navyLight, opacity: 0.12 },
  camNavRow: { flexDirection: "row", alignItems: "center" },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  camTitle:  { color: C.white, fontSize: 16, fontWeight: "800" },
  camSub:    { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },
  aicteBadge:     { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,149,42,0.4)" },
  aicteBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  // GPS bar
  gpsBar: { position: "absolute", top: 118, left: 16, right: 16, gap: 10 },
  gpsBlur:    { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: `rgba(${C_GPS},0.3)`, backgroundColor: "rgba(0,0,0,0.5)" },
  gpsContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  gpsDot:     { width: 12, height: 12, borderRadius: 6 },
  gpsLabel:   { fontSize: 9, fontWeight: "700", color: C_GPS, letterSpacing: 1.2, marginBottom: 2 },
  gpsValue:   { fontSize: 14, fontWeight: "600", color: "#fff" },
  accBadge:   { backgroundColor: `rgba(16,185,129,0.2)`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: `rgba(16,185,129,0.3)` },
  accText:    { fontSize: 12, fontWeight: "700", color: C_GPS },
  coordsBar:  { borderRadius: 12, overflow: "hidden", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: `rgba(16,185,129,0.3)`, flexDirection: "row", alignItems: "center", gap: 8 },
  coordsBarText: { fontSize: 12, fontWeight: "600", color: "#fff", fontFamily: "monospace", flex: 1 },

  // Reticle
  reticleContainer: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  reticle: { width: 220, height: 220, position: "relative" },
  corner:  { position: "absolute", width: 35, height: 35, borderColor: C.gold, opacity: 0.8 },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  // Capture — portrait
  bottomBar:     { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingBottom: 50, gap: 14 },
  captureOuter:  { width: 85, height: 85, borderRadius: 42.5, backgroundColor: "rgba(201,149,42,0.25)", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: C.gold, shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  captureInner:  { width: 70, height: 70, borderRadius: 35, justifyContent: "center", alignItems: "center" },
  captureCore:   { width: 64, height: 64, borderRadius: 32, backgroundColor: C.white, justifyContent: "center", alignItems: "center" },
  captureCoreDisabled: { backgroundColor: "rgba(255,255,255,0.3)" },
  captureHint:   { fontSize: 13, fontWeight: "600", color: "#fff", textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },

  // Capture — landscape
  landscapeCapture: { position: "absolute", right: 20, top: "50%", transform: [{ translateY: -55 }] },
  landscapeBlur:    { borderRadius: 60, overflow: "hidden", padding: 8, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 2, borderColor: `rgba(201,149,42,0.5)` },
  landscapeOuter:   { width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(201,149,42,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: C.gold },
  landscapeInner:   { width: 94, height: 94, borderRadius: 47, justifyContent: "center", alignItems: "center" },
  landscapeCore:    { width: 86, height: 86, borderRadius: 43, backgroundColor: C.white, justifyContent: "center", alignItems: "center" },

  // Preview
  previewTopBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    backgroundColor: "rgba(11,45,107,0.88)",
    paddingTop: 48, paddingBottom: 14, paddingHorizontal: 20,
  },
  previewNavRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionBadge:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(201,149,42,0.2)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,149,42,0.35)" },
  sessionLabel:  { fontSize: 9, fontWeight: "700", color: C.gold, letterSpacing: 1.2 },
  sessionCode:   { fontSize: 16, fontWeight: "700", color: C.white, fontFamily: "monospace" },

  // Overlay
  overlayContainer:          { position: "absolute", bottom: 0, left: 0, right: 0, height: 300 },
  overlayContainerLandscape: { height: 220 },
  gradientOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,24,69,0.80)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 2, borderColor: "rgba(201,149,42,0.15)" },
  overlayContent:          { flex: 1, flexDirection: "row", paddingBottom: 88, paddingTop: 8 },
  overlayContentLandscape: { paddingBottom: 66, paddingTop: 6 },

  metaSection:          { flex: 1, paddingLeft: 18, paddingRight: 10, paddingTop: 14, gap: 10 },
  metaSectionLandscape: { paddingTop: 10, gap: 8 },
  metaCard:     { backgroundColor: "rgba(201,149,42,0.10)", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,149,42,0.2)", gap: 5 },
  metaCardRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  metaCardLabel:{ fontSize: 9, fontWeight: "700", color: C.gold, letterSpacing: 1 },
  metaCardValue:{ fontSize: 13, fontWeight: "600", color: "#fff", fontFamily: "monospace" },

  mapSection:          { flex: 1, paddingRight: 18, paddingLeft: 10, paddingTop: 14 },
  mapSectionLandscape: { paddingTop: 10 },
  mapContainer: { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(201,149,42,0.3)", backgroundColor: "#111" },
  map:          { flex: 1 },
  marker:       { shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 8 },
  mapHeader:    { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.75)", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: "rgba(201,149,42,0.3)" },
  mapHeaderText:{ fontSize: 10, fontWeight: "700", color: C.gold, letterSpacing: 0.5 },
  coordsFooter: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.80)", paddingHorizontal: 12, paddingVertical: 10, gap: 5, borderTopWidth: 1, borderTopColor: "rgba(201,149,42,0.2)" },
  coordRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  coordLabel:   { fontSize: 9, fontWeight: "700", color: C.gold, letterSpacing: 1, minWidth: 34 },
  coordValue:   { fontSize: 11, fontWeight: "600", color: "#fff", fontFamily: "monospace", flex: 1 },

  // Action buttons
  actionRow:  { position: "absolute", bottom: 22, left: 16, right: 16, flexDirection: "row", gap: 12 },
  retakeBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: C.navy, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  confirmBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: C.navy, shadowColor: C.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  actionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});