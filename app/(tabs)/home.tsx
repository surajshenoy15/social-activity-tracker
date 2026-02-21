import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";

const { width, height } = Dimensions.get("window");

export default function Home() {
  const navigation = useNavigation();

  // Hide the bottom tab bar on this login screen
  useEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d3352" />

      {/* ── Top Hero Section ── */}
      <LinearGradient
        colors={["#0d3352", "#1a5f8a", "#2271a3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Brand */}
        <View style={styles.brandRow}>
          {/* Vikasana logo — replace Image src with your actual asset */}
          <View style={styles.logoBadge}>
            
                <Image source={require("../../assets/images/vikasana_logo.png")} style={styles.logoImg} resizeMode="contain" /> 
           
            
          </View>
          <View>
            <Text style={styles.brandName}>Vikasana Foundation</Text>
            <Text style={styles.brandTagline}>Empowering Communities</Text>
          </View>
        </View>

        {/* Hero copy */}
        <Text style={styles.heroEyebrow}>SOCIAL ACTIVITY TRACKER</Text>
        <Text style={styles.heroTitle}>{"Track. Earn.\nGet Rewarded."}</Text>
        <Text style={styles.heroSubtitle}>
          Log your social activities and earn verified certificates for your contributions.
        </Text>
      </LinearGradient>

      {/* ── Bottom Sheet ── */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetHeading}>Sign in to continue</Text>
        <Text style={styles.sheetSub}>Select your role to get started</Text>

        {/* Student Card */}
        <TouchableOpacity
          style={styles.loginCard}
          activeOpacity={0.85}
          onPress={() => router.push("/student-login")}
        >
          <View style={[styles.cardIcon, styles.cardIconStudent]}>
            {/* Replace emoji with your image asset if available */}
            <Text style={styles.cardIconText}>🎓</Text>
          </View>
          <View style={styles.cardLabel}>
            <Text style={styles.cardTitle}>Student Login</Text>
            <Text style={styles.cardDesc}>Track & earn your certificates</Text>
          </View>
          <View style={styles.cardArrow}>
            <Text style={styles.cardArrowText}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Faculty Card */}
<TouchableOpacity
  style={styles.loginCard}
  activeOpacity={0.85}
  onPress={() => router.push("/faculty-login")}
>
  <View style={[styles.cardIcon, styles.cardIconFaculty]}>
    <Text style={styles.cardIconText}>👩‍💼</Text>
  </View>
  <View style={styles.cardLabel}>
    <Text style={styles.cardTitle}>Faculty Login</Text>
    <Text style={styles.cardDesc}>Verify & manage student activities</Text>
  </View>
  <View style={styles.cardArrow}>
    <Text style={styles.cardArrowText}>›</Text>
  </View>
</TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Divider line */}
          <View style={styles.footerDividerLine} />

          <Text style={styles.footerMadeby}>
            {"Made with ♥ for "}
            <Text style={styles.footerBrand}>{"Vikasana Foundation"}</Text>
          </Text>

          <View style={styles.footerLinks}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/terms")}
            >
              <Text style={styles.footerLink}>{"Terms of Service"}</Text>
            </TouchableOpacity>

            <View style={styles.footerSeparator}>
              <Text style={styles.footerSepText}>{"·"}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/privacy")}
            >
              <Text style={styles.footerLink}>{"Privacy Policy"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerVersion}>{"v1.0.0"}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d3352",
  },

  // ── Hero ──────────────────────────────────────────
  hero: {
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 28,
    position: "relative",
    overflow: "hidden",
  },

  decorCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -80,
    right: -80,
  },
  decorCircle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(92,184,92,0.08)",
    bottom: -30,
    left: -40,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImg: {
    width: 30,
    height: 30,
  },
  logoEmoji: {
    fontSize: 22,
  },
  brandName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  brandTagline: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "400",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 1,
  },

  heroEyebrow: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
  },

  // ── Bottom Sheet ──────────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: "#f4f8fc",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -28,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    backgroundColor: "#cddae6",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetHeading: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0d3352",
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    color: "#7a9ab5",
    fontWeight: "400",
    marginBottom: 24,
  },

  // ── Login Cards ───────────────────────────────────
  loginCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 14,
    shadowColor: "#0d3352",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconStudent: {
    backgroundColor: "#dff0fa",
  },
  cardIconFaculty: {
    backgroundColor: "#dff5eb",
  },
  cardIconText: {
    fontSize: 24,
  },

  cardLabel: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0d3352",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: "#8aabbd",
    fontWeight: "400",
  },

  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#0d3352",
    justifyContent: "center",
    alignItems: "center",
  },
  cardArrowText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "300",
    lineHeight: 26,
    marginTop: -2,
  },

  // ── Footer ────────────────────────────────────────
  footer: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 20,
    paddingBottom: 8,
  },
  footerDividerLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#e2eaf2",
    marginBottom: 16,
  },
  footerMadeby: {
    fontSize: 12,
    color: "#a0b8cc",
    fontWeight: "400",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  footerBrand: {
    color: "#2271a3",
    fontWeight: "700",
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 12,
    color: "#2271a3",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  footerSeparator: {
    paddingHorizontal: 2,
  },
  footerSepText: {
    color: "#b0c7d8",
    fontSize: 14,
    lineHeight: 16,
  },
  footerVersion: {
    fontSize: 10,
    color: "#c8d8e4",
    fontWeight: "400",
    letterSpacing: 0.5,
  },
});