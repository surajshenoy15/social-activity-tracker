import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ChevronRight,
  GraduationCap,
  Users,
  Award,
  Shield,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  navy:      "#0B2D6B",
  navyMid:   "#1A47A0",
  navyLight: "#3B6FD4",
  sage:      "#C7D8F5",
  sageLight: "#EBF1FB",
  gold:      "#C9952A",
  white:     "#FFFFFF",
  ink:       "#111827",
  muted:     "#6B7280",
  bgDeep:    "#061845",
  bg:        "#F0F4FC",
};

// ─── Decorative circles ──────────────────────────────────────
function DecorCircles() {
  return (
    <>
      <View style={dc.c1} />
      <View style={dc.c2} />
      <View style={dc.c3} />
      <View style={dc.c4} />
    </>
  );
}
const dc = StyleSheet.create({
  c1: { position: "absolute", top: -60, right: -60,  width: 220, height: 220, borderRadius: 110, backgroundColor: C.navyLight, opacity: 0.12 },
  c2: { position: "absolute", top: 60,  right: 20,   width: 90,  height: 90,  borderRadius: 45,  backgroundColor: C.gold,       opacity: 0.10 },
  c3: { position: "absolute", top: -20, left: -40,   width: 150, height: 150, borderRadius: 75,  backgroundColor: C.navyMid,    opacity: 0.10 },
  c4: { position: "absolute", bottom: 30, left: width * 0.45, width: 60, height: 60, borderRadius: 30, backgroundColor: C.gold, opacity: 0.07 },
});

// ─── Dot strip ───────────────────────────────────────────────
function DotStrip() {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={i} style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: i % 3 === 0 ? C.gold : C.sage,
          opacity: 0.6,
        }} />
      ))}
    </View>
  );
}

// ─── Login role card ─────────────────────────────────────────
function RoleCard({
  emoji, title, desc, iconBg, onPress, delay, fadeAnim, slideAnim,
}: {
  emoji: string; title: string; desc: string; iconBg: string;
  onPress: () => void; delay: number;
  fadeAnim: Animated.Value; slideAnim: Animated.Value;
}) {
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.82}>
        <View style={[s.cardIcon, { backgroundColor: iconBg }]}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardDesc}>{desc}</Text>
        </View>
        <View style={s.cardArrow}>
          <ChevronRight size={18} color={C.white} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function Home() {
  const navigation = useNavigation();

  // Animations
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const card1Fade   = useRef(new Animated.Value(0)).current;
  const card1Slide  = useRef(new Animated.Value(30)).current;
  const card2Fade   = useRef(new Animated.Value(0)).current;
  const card2Slide  = useRef(new Animated.Value(30)).current;
  const footerFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Hide tab bar
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => { parent?.setOptions({ tabBarStyle: undefined }); };
  }, [navigation]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
        Animated.timing(headerAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(card1Slide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
        Animated.timing(card1Fade,  { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(card2Slide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
        Animated.timing(card2Fade,  { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(footerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      {/* ── Header ───────────────────────────────────── */}
      <View style={s.header}>
        <DecorCircles />

        {/* Brand row */}
        <Animated.View style={[s.brandRow, { opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
          <View style={s.logoBadge}>
            <Image
              source={require("../../assets/images/vikasana_logo.png")}
              style={s.logoImg}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={s.brandName}>Vikasana Foundation</Text>
            <Text style={s.brandTagline}>EMPOWERING COMMUNITIES</Text>
          </View>
        </Animated.View>

        {/* Blue geometric header graphic */}
        <View style={s.headerGraphic}>
          <View style={s.gridWrap}>
            {Array.from({ length: 24 }).map((_, i) => (
              <View key={i} style={[s.gridCell, {
                opacity: [0, 5, 10, 15, 19, 23].includes(i) ? 0.35 : [1, 6, 11, 16].includes(i) ? 0.20 : 0.10,
                backgroundColor: i % 5 === 0 ? C.gold : C.navyLight,
              }]} />
            ))}
          </View>
          {/* Center shield */}
          <View style={s.centerShieldOuter}>
            <View style={s.centerShieldInner}>
              <Shield size={32} color={C.white} strokeWidth={1.5} />
            </View>
          </View>
        </View>

        {/* Hero text */}
        <Animated.View style={[s.heroTextWrap, { opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
          <View style={s.tagRow}>
            <View style={s.tag}><Text style={s.tagText}>AICTE · VTU</Text></View>
            <View style={s.tag}><Text style={s.tagText}>Social Activity Tracker</Text></View>
          </View>
          <Text style={s.heroTitle}>{"Track. Earn.\nGet Rewarded."}</Text>
          <Text style={s.heroSub}>
            Log social activities and earn verified certificates for your contributions.
          </Text>

          {/* Stat pills */}
          <View style={s.statRow}>
            {[
              { Icon: Users,       label: "Students",    value: "1200+" },
              { Icon: Award,       label: "Certificates", value: "4500+" },
              { Icon: GraduationCap, label: "Colleges",  value: "12+" },
            ].map(({ Icon, label, value }) => (
              <View key={label} style={s.statPill}>
                <Icon size={14} color={C.gold} strokeWidth={2} />
                <Text style={s.statValue}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Pull handle */}
        <View style={s.pullHandle} />
      </View>

      {/* ── Sheet ────────────────────────────────────── */}
      <View style={s.sheet}>

        <View style={s.sheetTitleRow}>
          <View>
            <Text style={s.sheetTitle}>Sign in to continue</Text>
            <Text style={s.sheetSub}>Select your role to get started</Text>
          </View>
        </View>

        <DotStrip />

        <RoleCard
          emoji="🎓"
          title="Student Login"
          desc="Track & earn your certificates"
          iconBg={C.sageLight}
          onPress={() => router.push("/student-login")}
          delay={0}
          fadeAnim={card1Fade}
          slideAnim={card1Slide}
        />

        <RoleCard
          emoji="👩‍💼"
          title="Faculty Login"
          desc="Verify & manage student activities"
          iconBg="#EBF1FB"
          onPress={() => router.push("/faculty-login")}
          delay={100}
          fadeAnim={card2Fade}
          slideAnim={card2Slide}
        />

        {/* Gold accent strip */}
        <View style={s.goldStrip} />

        {/* Footer */}
        <Animated.View style={[s.footer, { opacity: footerFade }]}>
          <Text style={s.footerMadeby}>
            Made with ♥ for{" "}
            <Text style={s.footerBrand}>Vikasana Foundation</Text>
          </Text>
          <View style={s.footerLinks}>
            <TouchableOpacity onPress={() => router.push("/terms")} activeOpacity={0.7}>
              <Text style={s.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={s.footerSep}>·</Text>
            <TouchableOpacity onPress={() => router.push("/privacy")} activeOpacity={0.7}>
              <Text style={s.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.footerVersion}>v1.0.0  ·  AICTE Approved  ·  VTU Affiliated</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgDeep },

  // Header
  header: {
    backgroundColor: C.bgDeep,
    overflow: "hidden",
    position: "relative",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
  },
  logoBadge: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  logoImg:     { width: 30, height: 30 },
  brandName:   { color: C.white, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  brandTagline:{ color: "rgba(255,255,255,0.45)", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 },

  // Blue grid graphic (same pattern as FacultyLogin)
  headerGraphic: {
    width: "100%", height: 140,
    backgroundColor: C.navy,
    overflow: "hidden", position: "relative",
    justifyContent: "center", alignItems: "center",
  },
  gridWrap: {
    position: "absolute", flexDirection: "row", flexWrap: "wrap",
    width: "100%", height: "100%", padding: 10, gap: 8,
  },
  gridCell: { width: 34, height: 34, borderRadius: 8 },
  centerShieldOuter: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: "rgba(59,111,212,0.3)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  centerShieldInner: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: C.navyMid,
    justifyContent: "center", alignItems: "center",
    shadowColor: C.navyLight, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 8,
  },

  heroTextWrap: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  tagRow:  { flexDirection: "row", gap: 8, marginBottom: 12 },
  tag:     { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 6, borderWidth: 1, borderColor: "rgba(201,149,42,0.35)" },
  tagText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle:{ fontSize: 32, fontWeight: "900", color: C.white, lineHeight: 40, letterSpacing: -0.5 },
  heroSub:  { marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "400", lineHeight: 19 },

  // Stat pills
  statRow: {
    flexDirection: "row", gap: 10, marginTop: 16,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statPill:  { flex: 1, alignItems: "center", gap: 3 },
  statValue: { color: C.white, fontSize: 15, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "600" },

  pullHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignSelf: "center", marginTop: 18, marginBottom: 0,
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -14,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetTitleRow: { marginBottom: 20 },
  sheetTitle:    { fontSize: 22, fontWeight: "900", color: C.ink, letterSpacing: -0.3 },
  sheetSub:      { fontSize: 13, color: C.muted, marginTop: 4 },

  // Role cards
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 14,
    borderWidth: 1.5,
    borderColor: C.sage,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardIcon:  { width: 54, height: 54, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  cardBody:  { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: C.ink, marginBottom: 3 },
  cardDesc:  { fontSize: 12, color: C.muted, fontWeight: "400" },
  cardArrow: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: C.navy,
    justifyContent: "center", alignItems: "center",
  },

  // Gold strip
  goldStrip: {
    height: 3, borderRadius: 2,
    backgroundColor: C.gold,
    marginTop: 6, marginBottom: 16, opacity: 0.65,
  },

  // Footer
  footer:       { alignItems: "center", marginTop: "auto", paddingTop: 4 },
  footerMadeby: { fontSize: 12, color: "#9CA3AF", marginBottom: 8 },
  footerBrand:  { color: C.navyMid, fontWeight: "700" },
  footerLinks:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  footerLink:   { fontSize: 12, color: C.navyMid, fontWeight: "600" },
  footerSep:    { color: "#D1D5DB", fontSize: 14 },
  footerVersion:{ fontSize: 10, color: "#D1D5DB", letterSpacing: 0.4 },
});