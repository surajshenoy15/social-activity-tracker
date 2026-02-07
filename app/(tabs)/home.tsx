import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable } from "react-native";


const { width, height } = Dimensions.get("window");

export default function Home() {
  return (
    <ImageBackground
      source={require("../../assets/images/bg/login_header.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.7)", "rgba(240,248,245,0.8)", "rgba(255,255,255,0.7)"]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.welcome}>Welcome to</Text>
            <Text style={styles.title}>Social Activity Tracker</Text>
            <Text style={styles.subtitle}>
              Track, Earn Certificates and Get Rewarded !
            </Text>

            {/* Logos */}
            <View style={styles.logosContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>VTU</Text>
              </View>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.logoCircleAICTE}>
                <Text style={styles.logoTextAICTE}>AICTE</Text>
              </View>
            </View>
          </View>

          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={require("../../assets/images/bg/login_header.png")}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* Login Cards */}
          <View style={styles.cardsContainer}>
            <View style={styles.cardsRow}>
              <View style={styles.card}>
                <View style={styles.imageContainer}>
                  <Image 
                    source={require("../../assets/images/roles/student.png")} 
                    style={styles.roleImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cardTitle}>Student</Text>
                <Text style={styles.cardSubtitle}>Login</Text>
                <TouchableOpacity 
                  style={styles.cardButton}
                  onPress={() => router.push("/student-login")
}
                >
                  <Text style={styles.cardButtonText}>Student Login</Text>
                  <Text style={styles.cardButtonArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <View style={styles.imageContainer}>
                  <Image 
                    source={require("../../assets/images/roles/faculty.png")} 
                    style={styles.roleImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cardTitle}>Faculty</Text>
                <Text style={styles.cardSubtitle}>Login</Text>
                <TouchableOpacity 
                  style={styles.cardButton}
                  onPress={() => router.replace("/(tabs)/home")}
                >
                  <Text style={styles.cardButtonText}>Faculty Login</Text>
                  <Text style={styles.cardButtonArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <View style={styles.imageContainer}>
                  <Image 
                    source={require("../../assets/images/roles/admin.png")} 
                    style={styles.roleImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cardTitle}>Admin</Text>
                <Text style={styles.cardSubtitle}>Login</Text>
                <TouchableOpacity 
                  style={styles.cardButton}
                  onPress={() => router.replace("/(tabs)/home")}
                >
                  <Text style={styles.cardButtonText}>Admin Login</Text>
                  <Text style={styles.cardButtonArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Made for</Text>
            <Text style={styles.footerTitle}>
              Visvesvaraya Technological University (VTU)
            </Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerDivider}>|</Text>
              <Text style={styles.footerLink}>Privacy</Text>
            </View>
          </View>

          {/* Bottom Landscape */}
          <View style={styles.bottomLandscape}>
            <Image
              source={require("../../assets/images/bg/login_header.png")}
              style={styles.landscapeImage}
              resizeMode="cover"
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Header Styles
  header: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  welcome: {
    fontSize: 15,
    color: "#5a5a5a",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2d4a3e",
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#4a6b5a",
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.2,
    marginTop: 6,
  },

  // Logos
  logosContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4a6b54",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  logoCircleAICTE: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5c842",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoTextAICTE: {
    color: "#2d4a3e",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dividerContainer: {
    width: 30,
    alignItems: "center",
  },
  dividerLine: {
    width: 1,
    height: 30,
    backgroundColor: "#8fa890",
  },

  // Hero Image
  heroContainer: {
    width: "100%",
    height: 180,
    marginTop: 12,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },

  // Cards Container
  cardsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  card: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },

  imageContainer: {
    width: "100%",
    height: 85,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  
  roleImage: {
    width: 80,
    height: 80,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2d4a3e",
    textAlign: "center",
    marginTop: 4,
  },

  cardSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2d4a3e",
    textAlign: "center",
    marginBottom: 8,
  },

  cardButton: {
    backgroundColor: "#4a6b54",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  cardButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  cardButtonArrow: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 2,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: "#5a5a5a",
    fontWeight: "500",
  },
  footerTitle: {
    fontSize: 12,
    color: "#2d4a3e",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  footerLink: {
    fontSize: 11,
    color: "#5a5a5a",
    fontWeight: "500",
  },
  footerDivider: {
    fontSize: 11,
    color: "#5a5a5a",
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