import React, { useMemo, useState } from "react";
import { Alert, View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { API_BASE } from "@/constants/api";

type ValidateResp = {
  activation_session_id: string;
  email_masked: string;
  expires_at: string;
};

export default function FacultyActivate() {
  // If you later open from deep link: /faculty-activate?token=xxxx
  const params = useLocalSearchParams<{ token?: string }>();
  const initialToken = useMemo(() => (typeof params.token === "string" ? params.token : ""), [params.token]);

  const [token, setToken] = useState(initialToken);
  const [sessionId, setSessionId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [setPasswordToken, setSetPasswordToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const validateToken = async () => {
    if (!token) {
      Alert.alert("Missing", "Paste activation token");
      return;
    }
    setLoading(true);
    try {
      const url = `${API_BASE}/faculty/activation/validate?token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const data: any = await res.json();

      if (!res.ok) {
        Alert.alert("Validate failed", data?.detail || "Invalid token");
        return;
      }

      const v = data as ValidateResp;
      setSessionId(v.activation_session_id);
      setMaskedEmail(v.email_masked);
      Alert.alert("Validated", `Session created for ${v.email_masked}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!sessionId) {
      Alert.alert("Missing", "Validate token first (session id not found)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/faculty/activation/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_session_id: sessionId }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Send OTP failed", data?.detail || "Failed");
        return;
      }

      Alert.alert("OTP sent", `Check email: ${maskedEmail || "faculty inbox"}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!sessionId) {
      Alert.alert("Missing", "Validate token first");
      return;
    }
    if (!otp) {
      Alert.alert("Missing", "Enter OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/faculty/activation/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_session_id: sessionId, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Verify failed", data?.detail || "Invalid OTP");
        return;
      }

      setSetPasswordToken(data?.set_password_token || "");
      Alert.alert("OTP Verified", "Now set your password");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const setPassword = async () => {
    if (!setPasswordToken) {
      Alert.alert("Missing", "Verify OTP first");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Weak password", "Enter minimum 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/faculty/activation/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set_password_token: setPasswordToken, new_password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Set password failed", data?.detail || "Failed");
        return;
      }

      Alert.alert("Activated ✅", "Password set. Please login now.");
      router.replace("/faculty-login");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 18, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Faculty Activation</Text>

      <Text style={{ color: "#555" }}>
        Paste token from email / terminal and complete OTP verification.
      </Text>

      <TextInput
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        placeholder="Activation token (paste here)"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          padding: 12,
          minHeight: 80,
        }}
      />

      <Pressable
        onPress={validateToken}
        disabled={loading}
        style={{
          backgroundColor: "#1565c0",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Validate Token</Text>}
      </Pressable>

      {!!sessionId && (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 10, gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>Session: {sessionId.slice(0, 10)}...</Text>
          <Text>Email: {maskedEmail || "-"}</Text>

          <Pressable
            onPress={sendOtp}
            disabled={loading}
            style={{
              backgroundColor: "#0f7a3a",
              padding: 12,
              borderRadius: 10,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Send OTP</Text>}
          </Pressable>

          <TextInput
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            placeholder="Enter OTP"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              padding: 12,
            }}
          />

          <Pressable
            onPress={verifyOtp}
            disabled={loading}
            style={{
              backgroundColor: "#f59e0b",
              padding: 12,
              borderRadius: 10,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Verify OTP</Text>}
          </Pressable>

          {!!setPasswordToken && (
            <>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Set new password"
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  padding: 12,
                }}
              />

              <Pressable
                onPress={setPassword}
                disabled={loading}
                style={{
                  backgroundColor: "#1565c0",
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Set Password & Activate</Text>}
              </Pressable>
            </>
          )}
        </View>
      )}

      <Pressable onPress={() => router.replace("/faculty-login")}>
        <Text style={{ color: "#1565c0", textAlign: "center", marginTop: 10 }}>
          Back to Faculty Login
        </Text>
      </Pressable>
    </View>
  );
}