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
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as ScreenOrientation from "expo-screen-orientation";
import { router } from "expo-router";
import { generateSessionCode } from "../../utils/sessionCode";
import { BlurView } from "expo-blur";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

export default function ActivityCameraScreen() {
  const cameraRef = useRef<any>(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const [sessionCode] = useState(generateSessionCode("CLN"));

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gpsSignalAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Unlock screen orientation to allow auto-rotation
    const unlockOrientation = async () => {
      await ScreenOrientation.unlockAsync();
    };

    unlockOrientation();

    requestPermission();

    let locationSubscription: any;

    (async () => {
      const locationStatus =
        await Location.requestForegroundPermissionsAsync();

      if (locationStatus.status === "granted") {
        setLocationPermission(true);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 500,
            distanceInterval: 0.5,
          },
          (location) => {
            setCurrentLocation(location.coords);
            setGpsAccuracy(location.coords.accuracy || null);
            setIsGettingLocation(false);
          }
        );
      } else {
        setLocationPermission(false);
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      // Lock orientation back to portrait when leaving screen
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // GPS signal animation
  useEffect(() => {
    if (!isGettingLocation && currentLocation) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gpsSignalAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(gpsSignalAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isGettingLocation, currentLocation]);

  // Capture button pulse animation
  useEffect(() => {
    if (!isGettingLocation) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isGettingLocation]);

  const capturePhoto = async () => {
    if (!cameraRef.current) return;

    if (!currentLocation) {
      Alert.alert("GPS Signal Required", "Waiting for GPS signal...");
      return;
    }

    try {
      // Flash animation
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
      });

      const timestamp = new Date().toLocaleString();

      setCapturedPhoto({
        ...photo,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: gpsAccuracy,
        timestamp,
        sessionCode,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to capture photo");
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleDone = () => {
    Alert.alert("Success", "Photo saved successfully");
    router.back();
  };

  const getGPSSignalStrength = () => {
    if (!gpsAccuracy) return "Acquiring...";
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

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted || !locationPermission) {
    return (
      <View style={styles.center}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            Camera and Location access needed
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capturedPhoto ? (
        <>
          <Image source={{ uri: capturedPhoto.uri }} style={styles.preview} />

          {/* Modern Dark Overlay with Map */}
          <View style={[
            styles.overlayContainer,
            isLandscape && styles.overlayContainerLandscape
          ]}>
            {/* Dark gradient backdrop */}
            <View style={styles.gradientOverlay} />
            
            <View style={[
              styles.overlayContent,
              isLandscape && styles.overlayContentLandscape
            ]}>
              {/* Left Side - Metadata */}
              <View style={[
                styles.metadataSection,
                isLandscape && styles.metadataSectionLandscape
              ]}>
                {/* Session Badge */}
                <View style={[
                  styles.sessionContainer,
                  isLandscape && { gap: 6 }
                ]}>
                  <View style={styles.sessionBadge}>
                    <Ionicons name="barcode-outline" size={16} color="#10B981" />
                    <Text style={styles.sessionLabel}>SESSION ID</Text>
                  </View>
                  <Text style={[
                    styles.sessionCode,
                    isLandscape && { fontSize: 16 }
                  ]}>{sessionCode}</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Metadata Cards */}
                <View style={[
                  styles.metadataCards,
                  isLandscape && { gap: 8 }
                ]}>
                  <View style={[
                    styles.metadataCard,
                    isLandscape && { padding: 10 }
                  ]}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="time-outline" size={14} color="#10B981" />
                      <Text style={styles.cardLabel}>CAPTURED</Text>
                    </View>
                    <Text style={[
                      styles.cardValue,
                      isLandscape && { fontSize: 12 }
                    ]}>
                      {capturedPhoto.timestamp}
                    </Text>
                  </View>

                  <View style={[
                    styles.metadataCard,
                    isLandscape && { padding: 10 }
                  ]}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="locate" size={14} color="#10B981" />
                      <Text style={styles.cardLabel}>GPS ACCURACY</Text>
                    </View>
                    <Text style={[
                      styles.cardValue,
                      isLandscape && { fontSize: 12 }
                    ]}>
                      ±{capturedPhoto.accuracy?.toFixed(1) || "N/A"}m
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right Side - Map */}
              <View style={[
                styles.mapSection,
                isLandscape && styles.mapSectionLandscape
              ]}>
                <View style={styles.mapContainer}>
                  <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                      latitude: capturedPhoto.latitude,
                      longitude: capturedPhoto.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: capturedPhoto.latitude,
                        longitude: capturedPhoto.longitude,
                      }}
                    >
                      <View style={styles.customMarker}>
                        <Ionicons name="location" size={32} color="#10B981" />
                      </View>
                    </Marker>
                  </MapView>
                  
                  {/* Map Header Badge */}
                  <View style={styles.mapHeader}>
                    <Ionicons name="map" size={16} color="#10B981" />
                    <Text style={styles.mapHeaderText}>GPS Location</Text>
                  </View>

                  {/* Coordinates Footer */}
                  <View style={styles.coordsFooter}>
                    <View style={styles.coordRow}>
                      <Ionicons name="navigate" size={12} color="#10B981" />
                      <Text style={styles.coordLabel}>LAT</Text>
                      <Text style={styles.coordValue}>
                        {capturedPhoto.latitude.toFixed(6)}°
                      </Text>
                    </View>
                    <View style={styles.coordRow}>
                      <Ionicons name="compass" size={12} color="#10B981" />
                      <Text style={styles.coordLabel}>LONG</Text>
                      <Text style={styles.coordValue}>
                        {capturedPhoto.longitude.toFixed(6)}°
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retakeButton]}
              onPress={handleRetake}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleDone}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <CameraView style={styles.camera} ref={cameraRef} facing="back" />

          {/* Flash overlay */}
          <Animated.View
            style={[
              styles.flashOverlay,
              {
                opacity: flashAnim,
              },
            ]}
          />

          {/* Modern GPS Status Bar */}
          <View style={styles.topBar}>
            <BlurView intensity={80} tint="dark" style={styles.gpsStatusContainer}>
              <View style={styles.gpsStatusContent}>
                <Animated.View
                  style={[
                    styles.gpsIndicator,
                    {
                      backgroundColor: getGPSColor(),
                      opacity: gpsSignalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      }),
                      transform: [
                        {
                          scale: gpsSignalAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <View style={styles.gpsTextContainer}>
                  <Text style={styles.gpsStatusLabel}>GPS SIGNAL</Text>
                  <Text style={styles.gpsStatusValue}>
                    {isGettingLocation ? "Acquiring..." : getGPSSignalStrength()}
                  </Text>
                </View>
                {gpsAccuracy && (
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyText}>
                      ±{gpsAccuracy.toFixed(0)}m
                    </Text>
                  </View>
                )}
              </View>
            </BlurView>

            {currentLocation && (
              <BlurView intensity={80} tint="dark" style={styles.coordsContainer}>
                <Ionicons name="location-outline" size={14} color="#10B981" style={styles.coordsIcon} />
                <Text style={styles.coordsTextTop}>
                  {currentLocation.latitude.toFixed(6)}°, {currentLocation.longitude.toFixed(6)}°
                </Text>
              </BlurView>
            )}
          </View>

          {/* Reticle/Focus Guide */}
          <View style={styles.reticleContainer}>
            <View style={styles.reticle}>
              <View style={[styles.reticleCorner, styles.topLeft]} />
              <View style={[styles.reticleCorner, styles.topRight]} />
              <View style={[styles.reticleCorner, styles.bottomLeft]} />
              <View style={[styles.reticleCorner, styles.bottomRight]} />
            </View>
          </View>

          {/* Modern Capture Button - Portrait & Landscape */}
          {!isLandscape ? (
            // Portrait Mode - Bottom Center
            <View style={styles.bottomBar}>
              <View style={styles.captureContainer}>
                <Animated.View
                  style={[
                    styles.captureButtonOuter,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.captureButtonInner}
                    onPress={capturePhoto}
                    disabled={isGettingLocation}
                    activeOpacity={0.9}
                  >
                    <View
                      style={[
                        styles.captureButtonCore,
                        isGettingLocation && styles.captureButtonDisabled,
                      ]}
                    >
                      <Ionicons 
                        name="camera" 
                        size={28} 
                        color={isGettingLocation ? "#666" : "#000"} 
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <Text style={styles.captureHint}>
                {isGettingLocation
                  ? "Waiting for GPS signal..."
                  : "Tap to capture"}
              </Text>
            </View>
          ) : (
            // Landscape Mode - Bottom Right with Blur Background
            <View style={styles.landscapeCaptureContainer}>
              <BlurView 
                intensity={60} 
                tint="dark" 
                style={styles.landscapeCaptureBlur}
              >
                <Animated.View
                  style={[
                    styles.landscapeCaptureButtonOuter,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.landscapeCaptureButtonInner}
                    onPress={capturePhoto}
                    disabled={isGettingLocation}
                    activeOpacity={0.9}
                  >
                    <View
                      style={[
                        styles.landscapeCaptureButtonCore,
                        isGettingLocation && styles.captureButtonDisabled,
                      ]}
                    >
                      <Ionicons 
                        name="camera" 
                        size={40} 
                        color={isGettingLocation ? "#666" : "#000"} 
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </BlurView>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },

  // Flash effect
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    pointerEvents: "none",
  },

  // Top bar with GPS status
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    gap: 10,
  },

  gpsStatusContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },

  gpsStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },

  gpsIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },

  gpsTextContainer: {
    flex: 1,
  },

  gpsStatusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  gpsStatusValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  accuracyBadge: {
    backgroundColor: "rgba(16,185,129,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },

  accuracyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },

  coordsContainer: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  coordsIcon: {
    opacity: 0.8,
  },

  coordsTextTop: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "monospace",
    flex: 1,
  },

  // Reticle/Focus guide
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },

  reticle: {
    width: 220,
    height: 220,
    position: "relative",
  },

  reticleCorner: {
    position: "absolute",
    width: 35,
    height: 35,
    borderColor: "#10B981",
    opacity: 0.7,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },

  // Bottom bar with capture button (Portrait)
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 50,
    gap: 14,
  },

  captureContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  captureButtonOuter: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },

  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },

  captureButtonCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  captureButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  captureHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },

  // Landscape capture button - Right Side Centered
  landscapeCaptureContainer: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -55 }], // Half of button outer size (110/2)
  },

  landscapeCaptureBlur: {
    borderRadius: 60,
    overflow: "hidden",
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.5)",
  },

  landscapeCaptureButtonOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(16,185,129,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 15,
  },

  landscapeCaptureButtonInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    justifyContent: "center",
    alignItems: "center",
  },

  landscapeCaptureButtonCore: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  // Preview overlay - Modern Dark Theme
  overlayContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },

  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },

  overlayContent: {
    flex: 1,
    flexDirection: "row",
    paddingBottom: 85,
    paddingTop: 8,
  },

  // Left side - Metadata with modern cards
  metadataSection: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 10,
    paddingTop: 16,
    gap: 12,
  },

  sessionContainer: {
    gap: 8,
  },

  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sessionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 1.5,
  },

  sessionCode: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "monospace",
    letterSpacing: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(16,185,129,0.15)",
    marginVertical: 4,
  },

  metadataCards: {
    gap: 12,
  },

  metadataCard: {
    backgroundColor: "rgba(16,185,129,0.08)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
    gap: 6,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  cardLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 1,
  },

  cardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "monospace",
  },

  // Right side - Map with modern styling
  mapSection: {
    flex: 1,
    paddingRight: 20,
    paddingLeft: 10,
    paddingTop: 16,
  },

  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.3)",
  },

  map: {
    flex: 1,
  },

  customMarker: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },

  mapHeader: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },

  mapHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 0.5,
  },

  coordsFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,185,129,0.2)",
  },

  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  coordLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10B981",
    letterSpacing: 1,
    minWidth: 35,
  },

  coordValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "monospace",
    flex: 1,
  },

  // Action buttons - Modern design
  actionButtonsContainer: {
    position: "absolute",
    bottom: 22,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
  },

  retakeButton: {
    backgroundColor: "#F59E0B",
    borderColor: "rgba(245,158,11,0.5)",
  },

  confirmButton: {
    backgroundColor: "#10B981",
    borderColor: "rgba(16,185,129,0.5)",
  },

  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Permission screens
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },

  permissionBox: {
    backgroundColor: "rgba(16,185,129,0.1)",
    padding: 28,
    borderRadius: 20,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },

  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  permissionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
  },

  // Landscape-specific styles
  overlayContainerLandscape: {
    height: 220,
  },

  overlayContentLandscape: {
    paddingBottom: 65,
    paddingTop: 6,
  },

  metadataSectionLandscape: {
    paddingTop: 12,
    gap: 8,
  },

  mapSectionLandscape: {
    paddingTop: 12,
  },
});