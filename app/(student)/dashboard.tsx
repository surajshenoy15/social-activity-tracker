import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import {
  Bell, Upload, ChevronRight, Award, Clock,
  CheckCircle, XCircle, MapPin, Calendar,
  TrendingUp, FileText, Star, Plus,
} from "lucide-react-native";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

// ─── Colour tokens ──────────────────────────────────────────
const C = {
  navy:      "#0B2D6B",
  navyMid:   "#1A47A0",
  navyLight: "#3B6FD4",
  sage:      "#C7D8F5",
  sageLight: "#EBF1FB",
  gold:      "#C9952A",
  white:     "#FFFFFF",
  ink:       "#0F172A",
  muted:     "#64748B",
  bg:        "#F0F4FC",
  success:   "#16A34A",
  error:     "#DC2626",
  warning:   "#D97706",
  border:    "#E2E8F0",
};

type Tab = "My Activities" | "Pending" | "Approved" | "Cert";

const TABS: Tab[] = ["My Activities", "Pending", "Approved", "Cert"];

// ─── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; border: string }> = {
    Pending:  { color: C.warning, bg: "#FEF3C7", border: "#FDE68A" },
    Approved: { color: C.success, bg: "#DCFCE7", border: "#86EFAC" },
    Rejected: { color: C.error,   bg: "#FEE2E2", border: "#FCA5A5" },
  };
  const c = cfg[status] ?? cfg.Pending;
  return (
    <View style={[sb.wrap, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[sb.text, { color: c.color }]}>{status}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: "700" },
});

// ─── Dot strip ───────────────────────────────────────────────
function DotStrip({ style }: { style?: object }) {
  return (
    <View style={[{ flexDirection: "row", gap: 5, marginBottom: 16 }, style]}>
      {Array.from({ length: 14 }).map((_, i) => (
        <View key={i} style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: i % 3 === 0 ? C.gold : C.sage,
          opacity: 0.55,
        }} />
      ))}
    </View>
  );
}

// ─── Sample data ──────────────────────────────────────────────
const ACTIVITIES = [
  {
    id: 1,
    title: "Tree Plantation Drive",
    date: "April 15, 2025",
    description: "Participated in a tree plantation drive to promote environmental awareness in the local community.",
    image: require("../../assets/images/bg/login_header.png"),
    location: "Tumakuru, Karnataka, India",
    coordinates: "Lat 21.8681150°  Long 88.3207886°",
    timestamp: "20/04/24 20:17 PM GMT +05:30",
    status: "Pending",
    points: 50,
  },
];

// ─── Main screen ──────────────────────────────────────────────
export default function StudentHome() {
  const [activeTab, setActiveTab] = useState<Tab>("My Activities");

  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const bodyAnim   = useRef(new Animated.Value(0)).current;
  const bodySlide  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
        Animated.timing(headerAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(bodySlide,  { toValue: 0, tension: 50, friction: 11, useNativeDriver: true }),
        Animated.timing(bodyAnim,   { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const filteredActivities = activeTab === "My Activities"
    ? ACTIVITIES
    : ACTIVITIES.filter(a => a.status === activeTab || (activeTab === "Cert" && a.status === "Approved"));

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* ── Top Header ──────────────────────────────── */}
        <Animated.View style={[s.topBar, { opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
          {/* Decor */}
          <View style={s.decor1} />
          <View style={s.decor2} />

          {/* Nav row */}
          <View style={s.navRow}>
            <View style={s.brandRow}>
              <View style={s.logoBox}><Text style={s.logoText}>V</Text></View>
              <View>
                <Text style={s.brandName}>Vikasana Foundation</Text>
                <Text style={s.brandTagline}>EMPOWERING COMMUNITIES</Text>
              </View>
            </View>
            <TouchableOpacity style={s.bellBtn}>
              <Bell size={20} color="#8ab4d9" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Profile row */}
          <View style={s.profileRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>SJ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>Hello, Suraj! 👋</Text>
              <Text style={s.college}>BNM Institute of Technology</Text>
            </View>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>STUDENT</Text>
            </View>
          </View>

          {/* Tags */}
          <View style={s.tagRow}>
            <View style={s.tag}><Text style={s.tagText}>AICTE · VTU</Text></View>
            <View style={s.tag}><Text style={s.tagText}>Social Activity Tracker</Text></View>
          </View>
        </Animated.View>

        {/* ── Body ────────────────────────────────────── */}
        <Animated.View style={[{ backgroundColor: C.bg }, { opacity: bodyAnim, transform: [{ translateY: bodySlide }] }]}>

          {/* Points card */}
          <View style={s.section}>
            <View style={s.pointsCard}>
              {/* Header row */}
              <View style={s.pointsHeader}>
                <View style={s.trophyCircle}>
                  <Award size={24} color={C.gold} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pointsLabel}>Total Activity Points</Text>
                  <Text style={s.pointsValue}>200 <Text style={s.pointsUnit}>pts</Text></Text>
                </View>
                <View style={s.rankBadge}>
                  <Star size={12} color={C.gold} strokeWidth={2} />
                  <Text style={s.rankText}>Rank #12</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />

              {/* Progress */}
              <View style={s.progressRow}>
                <Text style={s.milestoneLabel}>Next Milestone</Text>
                <Text style={s.milestoneValue}>500 pts</Text>
              </View>
              <View style={s.progressBar}>
                <Animated.View style={[s.progressFill, { width: "40%" }]} />
              </View>
              <View style={s.progressFooter}>
                <Text style={s.progressPercent}>40% complete</Text>
                <Text style={s.progressRemain}>300 pts remaining</Text>
              </View>
            </View>
          </View>

          {/* Quick stats */}
          <View style={[s.section, { paddingTop: 0 }]}>
            <View style={s.statsRow}>
              {[
                { label: "Submitted",  value: "3",  color: C.navy,    Icon: FileText },
                { label: "Approved",   value: "1",  color: C.success, Icon: CheckCircle },
                { label: "Pending",    value: "2",  color: C.warning, Icon: Clock },
                { label: "Rejected",   value: "0",  color: C.error,   Icon: XCircle },
              ].map(({ label, value, color, Icon }) => (
                <View key={label} style={[s.statCard, { borderTopColor: color }]}>
                  <Icon size={16} color={color} strokeWidth={2} />
                  <Text style={[s.statValue, { color }]}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Create Activity CTA */}
          <View style={[s.section, { paddingTop: 0 }]}>
            <TouchableOpacity
              style={s.cta}
              onPress={() => router.push("/(student)/create-activity")}
              activeOpacity={0.85}
            >
              <View style={s.ctaIconWrap}>
                <Plus size={22} color={C.white} strokeWidth={2.5} />
              </View>
              <Text style={s.ctaText}>Create New Activity</Text>
              <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* ── Tabs ──────────────────────────────────── */}
          <View style={s.tabsWrap}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[s.tab, activeTab === tab && s.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <DotStrip style={{ paddingHorizontal: 20 }} />

          {/* ── Activity cards ─────────────────────────── */}
          <View style={s.section}>
            {filteredActivities.length === 0 ? (
              <View style={s.emptyState}>
                <FileText size={44} color={C.sage} strokeWidth={1.5} />
                <Text style={s.emptyText}>No activities here yet</Text>
              </View>
            ) : (
              filteredActivities.map(activity => (
                <View key={activity.id} style={s.activityCard}>

                  {/* Card header */}
                  <View style={s.activityCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.activityTitle}>{activity.title}</Text>
                      <View style={s.activityMeta}>
                        <Calendar size={12} color={C.muted} strokeWidth={2} />
                        <Text style={s.activityDate}>{activity.date}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <StatusBadge status={activity.status} />
                      <View style={s.pointsPill}>
                        <TrendingUp size={11} color={C.navyMid} strokeWidth={2.5} />
                        <Text style={s.pointsPillText}>+{activity.points} pts</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={s.activityDesc}>{activity.description}</Text>

                  {/* Image with location overlay */}
                  <View style={s.imageWrap}>
                    <Image source={activity.image} style={s.activityImage} resizeMode="cover" />

                    {/* Gold top-left corner */}
                    <View style={s.imageCornerTL} />
                    <View style={s.imageCornerBR} />

                    {/* Location overlay */}
                    <View style={s.locationOverlay}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                        <MapPin size={13} color={C.gold} strokeWidth={2} style={{ marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.locationText}>{activity.location}</Text>
                          <Text style={s.coordText}>{activity.coordinates}</Text>
                          <Text style={s.timestampText}>{activity.timestamp}</Text>
                        </View>
                      </View>
                      <View style={s.gpsBadge}>
                        <Text style={s.gpsBadgeText}>📍 GPS Map Camera</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card footer */}
                  <View style={s.cardFooter}>
                    <TouchableOpacity style={s.viewBtn}>
                      <FileText size={14} color={C.navyMid} strokeWidth={2} />
                      <Text style={s.viewBtnText}>View Details</Text>
                    </TouchableOpacity>
                    {activity.status === "Approved" && (
                      <TouchableOpacity style={s.certBtn}>
                        <Award size={14} color={C.gold} strokeWidth={2} />
                        <Text style={s.certBtnText}>Download Cert</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },

  // Top bar — same as FacultyDashboard
  topBar: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  decor1: { position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: C.navyLight, opacity: 0.10 },
  decor2: { position: "absolute", bottom: -10, right: 60, width: 70, height: 70, borderRadius: 35, backgroundColor: C.gold, opacity: 0.08 },

  navRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  brandRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox:   { width: 34, height: 34, borderRadius: 9, backgroundColor: C.navyMid, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  logoText:  { color: C.white, fontWeight: "800", fontSize: 15 },
  brandName: { color: C.white, fontWeight: "700", fontSize: 13 },
  brandTagline: { color: "#7baad4", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 1 },
  bellBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.10)", justifyContent: "center", alignItems: "center" },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar:     { width: 48, height: 48, borderRadius: 14, backgroundColor: C.navyMid, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" },
  avatarText: { color: C.white, fontWeight: "800", fontSize: 17 },
  greeting:   { color: C.white, fontSize: 18, fontWeight: "800" },
  college:    { color: "#7baad4", fontSize: 11, marginTop: 2 },
  roleBadge:  { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(201,149,42,0.2)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,149,42,0.35)" },
  roleBadgeText: { color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 },

  tagRow: { flexDirection: "row", gap: 8 },
  tag:    { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  tagText:{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },

  // Section wrapper
  section: { paddingHorizontal: 16, paddingTop: 16 },

  // Points card
  pointsCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 5,
  },
  pointsHeader:  { flexDirection: "row", alignItems: "center", gap: 12 },
  trophyCircle:  { width: 48, height: 48, borderRadius: 14, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" },
  pointsLabel:   { fontSize: 12, color: C.muted, fontWeight: "600" },
  pointsValue:   { fontSize: 28, fontWeight: "800", color: C.ink },
  pointsUnit:    { fontSize: 15, fontWeight: "500", color: C.muted },
  rankBadge:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  rankText:      { fontSize: 11, fontWeight: "700", color: C.gold },

  progressRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  milestoneLabel: { fontSize: 12, color: C.muted, fontWeight: "500" },
  milestoneValue: { fontSize: 13, fontWeight: "700", color: C.navy },
  progressBar:   { height: 8, backgroundColor: C.sageLight, borderRadius: 4, overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: C.navy, borderRadius: 4 },
  progressFooter:{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressPercent:{ fontSize: 11, color: C.navy, fontWeight: "700" },
  progressRemain: { fontSize: 11, color: C.muted, fontWeight: "500" },

  // Quick stats
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 12,
    alignItems: "center", gap: 4,
    borderTopWidth: 3, borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: "600", textAlign: "center" },

  // CTA
  cta: {
    backgroundColor: C.navy, borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 6,
  },
  ctaIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  ctaText:     { flex: 1, color: C.white, fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },

  // Tabs
  tabsWrap: {
    flexDirection: "row", paddingHorizontal: 16,
    paddingTop: 20, paddingBottom: 12, gap: 6, backgroundColor: C.bg,
  },
  tab:         { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: C.white, alignItems: "center", borderWidth: 1.5, borderColor: C.border },
  tabActive:   { backgroundColor: C.navy, borderColor: C.navy },
  tabText:     { fontSize: 12, fontWeight: "600", color: C.muted },
  tabTextActive:{ color: C.white, fontWeight: "700" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText:  { color: C.muted, fontSize: 15, fontWeight: "600", marginTop: 12 },

  // Activity card
  activityCard: {
    backgroundColor: C.white, borderRadius: 18,
    marginBottom: 16, overflow: "hidden",
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  activityCardHeader: { flexDirection: "row", alignItems: "flex-start", padding: 16, paddingBottom: 10, gap: 10 },
  activityTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 4 },
  activityMeta:  { flexDirection: "row", alignItems: "center", gap: 5 },
  activityDate:  { fontSize: 12, color: C.muted, fontWeight: "500" },
  pointsPill:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.sageLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pointsPillText:{ fontSize: 11, fontWeight: "700", color: C.navyMid },
  activityDesc:  { fontSize: 13, color: C.muted, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 14 },

  // Image
  imageWrap:     { position: "relative", marginHorizontal: 16, borderRadius: 14, overflow: "hidden", marginBottom: 0 },
  activityImage: { width: "100%", height: 220 },
  imageCornerTL: { position: "absolute", top: 0, left: 0, width: 30, height: 3, backgroundColor: C.gold },
  imageCornerBR: { position: "absolute", bottom: 0, right: 0, width: 30, height: 3, backgroundColor: C.gold },

  // Location overlay
  locationOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(6,24,69,0.88)",
    padding: 12,
  },
  locationText:  { fontSize: 11, color: C.white, fontWeight: "700", marginBottom: 2 },
  coordText:     { fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 1 },
  timestampText: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  gpsBadge:      { alignSelf: "flex-end", marginTop: 6, backgroundColor: "rgba(201,149,42,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "rgba(201,149,42,0.4)" },
  gpsBadgeText:  { fontSize: 10, color: C.gold, fontWeight: "700" },

  // Card footer
  cardFooter: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, marginTop: 14 },
  viewBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: C.sageLight, borderWidth: 1, borderColor: C.sage },
  viewBtnText:{ fontSize: 13, fontWeight: "700", color: C.navyMid },
  certBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A" },
  certBtnText:{ fontSize: 13, fontWeight: "700", color: C.gold },
});