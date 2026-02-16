import React from "react";
import { View, Text } from "react-native";
import styles from "../styles/cameraStyles";

interface Props {
  sessionCode: string;
}

const CameraOverlay: React.FC<Props> = ({ sessionCode }) => {
  return (
    <View style={styles.overlayContainer}>
      <Text style={styles.overlayTitle}>Activity Session</Text>
      <Text style={styles.overlayText}>{sessionCode}</Text>
    </View>
  );
};

export default CameraOverlay;
