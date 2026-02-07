import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useState } from "react";
import { router } from "expo-router";
import { Mail, Lock, Send, CheckCircle, User, ArrowLeft, AlertCircle } from "lucide-react-native";

export default function StudentLogin() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#4a6b54" strokeWidth={2.5} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Text style={styles.heroTitle}>Social Activity Tracker</Text>
          <Text style={styles.heroSubtitle}>
            Track, Earn Certificates and Get Rewarded !
          </Text>
          <View style={styles.heroImageWrapper}>
            <Image
              source={require("../assets/images/bg/login_header.png")}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Login Form */}
        <View style={styles.formSection}>
          {/* VTU Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.vtubadge}>
              <Text style={styles.vtuText}>VTU</Text>
            </View>
          </View>

          {/* AICTE Title */}
          <Text style={styles.aicteTitle}>AICTE</Text>
          
          {/* Welcome Text */}
          <Text style={styles.welcomeText}>
            Welcome back! Please sign in to continue.
          </Text>

          {/* Student Button */}
          <View style={styles.roleSelector}>
            <View style={styles.studentButton}>
              <User size={20} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.studentText}>Student</Text>
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#4a6b54" strokeWidth={2} />
              <TextInput
                placeholder="Enter your registered email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </View>
            <View style={styles.helperTextContainer}>
              <AlertCircle size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.helperText}>
                Only registered student emails can receive OTP
              </Text>
            </View>
          </View>

          {/* OTP Input (shown only after OTP is sent) */}
          {otpSent && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>One-Time Password</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#4a6b54" strokeWidth={2} />
                <TextInput
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  style={styles.input}
                />
              </View>
              <TouchableOpacity style={styles.resendButton}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Send OTP Button */}
          {!otpSent ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => setOtpSent(true)}
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.sendButtonText}>Send OTP</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
  style={styles.sendButton}
  onPress={async () => {
    console.log("VERIFY CLICKED");

    await AsyncStorage.setItem("role", "student");
    console.log("ROLE SAVED");

    router.replace("/(student)/dashboard");
  }}
>
  <CheckCircle size={18} color="#FFFFFF" strokeWidth={2.5} />
  <Text style={styles.sendButtonText}>Verify & Continue</Text>
</TouchableOpacity>

          )}
        </View>

        {/* Bottom Landscape */}
        <View style={styles.bottomLandscape}>
          <Image
            source={require("../assets/images/bg/login_header.png")}
            style={styles.landscapeImage}
            resizeMode="cover"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: "#4a6b54",
    fontWeight: "600",
  },

  // Hero Section
  heroContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4a6b54",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#4a6b54",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "500",
  },
  heroImageWrapper: {
    width: "100%",
    height: 180,
    marginTop: 16,
    borderRadius: 0,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },

  // Form Section
  formSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },

  // Badge
  badgeContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  vtubadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4a6b54",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  vtuText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // AICTE Title
  aicteTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4a6b54",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // Welcome Text
  welcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },

  // Role Selector
  roleSelector: {
    marginBottom: 20,
  },
  studentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4a6b54",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#4a6b54",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 10,
  },
  studentText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#4a6b54",
    marginBottom: 8,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1E3D1",
    paddingHorizontal: 14,
    paddingVertical: 2,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  helperTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
    fontStyle: "italic",
    flex: 1,
  },

  // Resend Button
  resendButton: {
    marginTop: 8,
    alignSelf: "flex-end",
  },
  resendText: {
    fontSize: 13,
    color: "#4a6b54",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Send Button
  sendButton: {
    backgroundColor: "#4a6b54",
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4a6b54",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    gap: 10,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Bottom Landscape
  bottomLandscape: {
    width: "100%",
    height: 100,
    marginTop: "auto",
  },
  landscapeImage: {
    width: "100%",
    height: "100%",
  },
});