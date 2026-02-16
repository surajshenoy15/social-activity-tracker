import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Camera } from "lucide-react-native";

export default function CreateActivity() {
  const [activityName, setActivityName] = useState("");
  const [activityType, setActivityType] = useState("");
  const [description, setDescription] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  const handleOpenCamera = () => {
    router.push("/(student)/activity-camera");
  };

  const handleSubmit = () => {
    if (!activityName.trim()) {
      Alert.alert("Activity name is required");
      return;
    }

    if (!activityType.trim()) {
      Alert.alert("Activity type is required");
      return;
    }

    if (photoCount < 3) {
      Alert.alert("Minimum 3 photos required");
      return;
    }

    Alert.alert("Activity Submitted Successfully 🎉");

    // Reset form
    setActivityName("");
    setActivityType("");
    setDescription("");
    setPhotoCount(0);

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color="#4a6b54" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Activity</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Activity Name */}
        <Text style={styles.label}>Activity Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter activity name"
          value={activityName}
          onChangeText={setActivityName}
        />

        {/* Activity Type */}
        <Text style={styles.label}>Activity Type *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g Cleaning, Plantation"
          value={activityType}
          onChangeText={setActivityType}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your activity..."
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {/* Photo Section */}
        <Text style={styles.label}>Photos (Min 3 – Max 5)</Text>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleOpenCamera}
        >
          <Camera size={20} color="#fff" />
          <Text style={styles.cameraButtonText}>
            Open Camera ({photoCount}/5)
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>Submit Activity</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4a6b54",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
    color: "#374151",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  cameraButton: {
    backgroundColor: "#4a6b54",
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  cameraButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  submitButton: {
    marginTop: 30,
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
