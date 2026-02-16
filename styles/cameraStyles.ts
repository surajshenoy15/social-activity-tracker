import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: "#ffffff",
  },
  overlayContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 12,
  },
  overlayTitle: {
    color: "#ffffff",
    fontSize: 12,
  },
  overlayText: {
    color: "#00FFCC",
    fontSize: 15,
    fontWeight: "bold",
  },
});
