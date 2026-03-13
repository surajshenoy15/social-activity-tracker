// app/(student)/terms-faq.tsx
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Linking,
  Alert,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  HelpCircle,
  Mail,
  Download,
  Users,
  Lock,
  Eye,
  Bell,
  MapPin,
  Camera,
  Award,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  BookOpen,
} from "lucide-react-native";
import { router } from "expo-router";

// ─── Colour tokens ────────────────────────────────────────────
const C = {
  navy: "#0B2D6B",
  navyMid: "#1A47A0",
  navyLight: "#3B6FD4",
  sage: "#C7D8F5",
  sageLight: "#EBF1FB",
  gold: "#C9952A",
  goldLight: "#FEF3C7",
  white: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  bg: "#F0F4FC",
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  border: "#E2E8F0",
};

const ADMIN_EMAIL = "admin@vikasanafoundation.org";

// ─── CSV Templates ────────────────────────────────────────────
const STUDENT_CSV = [
  "name,usn,email,branch,passout_year,admitted_year",
  "John Doe,1VB21CS001,john.doe@college.edu,Computer Science,2025,2021",
  "Jane Smith,1VB21EC002,jane.smith@college.edu,Electronics,2025,2021",
].join("\n");

const FACULTY_CSV = [
  "full_name,email,college,role",
  "John Doe,john.doe@example.com,Vidya Foundation,faculty",
  "Jane Smith,jane.smith@example.com,Vidya Foundation,coordinator",
].join("\n");

// ─── Share helper ─────────────────────────────────────────────
async function shareCSV(csvContent: string, label: string) {
  try {
    await Share.share({ title: label, message: csvContent });
  } catch (e: any) {
    Alert.alert("Error", e?.message ?? "Could not share template.");
  }
}

type TabType = "terms" | "privacy" | "faq";

// ─── FAQ Data ─────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    id: "f1",
    category: "Getting Started",
    icon: Users,
    q: "How do I register as a student on the app?",
    a: "Download the Vikasana Social Activity Tracker app, tap 'Student Login', and enter your credentials provided by your institution. If you haven't received credentials, contact your faculty coordinator.",
  },
  {
    id: "f2",
    category: "Getting Started",
    icon: Camera,
    q: "Why does the app need camera, selfie, and location access?",
    a: "Camera access is required to capture activity verification photos and, where enabled, selfie photographs for face-based identity verification. Location access is used to verify you are physically present at the event venue (geofence check). Selfie and face-verification data are used only for academic and institutional verification purposes such as preventing impersonation, validating activity participation, and protecting certificate integrity.",
  },
  {
    id: "f3",
    category: "Activities",
    icon: Award,
    q: "How are activity points calculated?",
    a: "Points are calculated based on the activity type and hours participated. Each activity type has a defined 'points per unit' and 'hours per unit' ratio configured by administrators. Your certificate will reflect the exact points awarded.",
  },
  {
    id: "f4",
    category: "Activities",
    icon: CheckCircle,
    q: "What happens after I submit my activity photos?",
    a: "Your submission is reviewed by the admin. Once approved, a certificate is automatically generated and becomes available in your Certificates section. The process typically takes 1–3 working days.",
  },
  {
    id: "f5",
    category: "Activities",
    icon: AlertCircle,
    q: "My submission was rejected. What should I do?",
    a: "Check the rejection reason provided by the admin. Common reasons include photos not showing activity participation, GPS location mismatch, face/selfie verification issues, or insufficient photo count. You may need to re-register for the event if it is still active.",
  },
  {
    id: "f6",
    category: "Certificates",
    icon: FileText,
    q: "How do I download my activity certificate?",
    a: "Go to any completed (Past) event card and tap 'Certificates'. Your certificates will be listed with a download option. Certificates are digitally signed and verifiable via a QR code.",
  },
  {
    id: "f7",
    category: "Certificates",
    icon: Shield,
    q: "Are my certificates authentic and verifiable?",
    a: "Yes. Every certificate issued through this platform is digitally signed with a unique certificate number (e.g., BG/VF/Jan1/2024-25) and includes a QR code that links to a verification page on our servers.",
  },
  {
    id: "f8",
    category: "Faculty & Admin",
    icon: Mail,
    q: "How can I register as a faculty member?",
    a: "Faculty registration requires admin approval. Email admin@vikasanafoundation.org with your request. Download the Faculty CSV Template from this page, fill in your details (full_name, email, college, role) and attach it to your email.",
  },
  {
    id: "f9",
    category: "Faculty & Admin",
    icon: Download,
    q: "Where can I get the CSV import templates?",
    a: "Both Faculty and Student CSV Templates are available for download in the Templates section of this page. Faculty columns: full_name, email, college, role. Student columns: name, usn, email, branch, passout_year, admitted_year.",
  },
  {
    id: "f10",
    category: "Technical",
    icon: MapPin,
    q: "The app says I am outside the event location. What do I do?",
    a: "Make sure your phone's GPS is enabled and set to 'High Accuracy' mode. Move closer to the event venue. If you believe there is an error, contact the event organiser — the geofence radius is configured by the admin and can be adjusted.",
  },
  {
    id: "f11",
    category: "Technical",
    icon: Bell,
    q: "I am not receiving notifications about events.",
    a: "Ensure notification permissions are granted for the app in your phone settings. Also check that your account email is correct. Event notifications are sent when new events are published by administrators.",
  },
  {
    id: "f12",
    category: "Privacy & Data",
    icon: Shield,
    q: "Will my selfie or face data be used for any purpose other than academics?",
    a: "No. Selfie photographs and face-verification data are intended only for academic, institutional, security, and verification purposes such as identity verification, preventing impersonation, validating participation, protecting certificate integrity, audit, and grievance handling. They are not intended for advertising or unrelated marketing use.",
  },
];

const TERMS_SECTIONS = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    body: `By accessing or using the Vikasana Social Activity Tracker ("the App"), you agree to be bound by these Terms and Conditions and to the processing of your personal data as described in the Privacy Policy. If you do not agree, please discontinue use immediately.\n\nThese terms apply to all users including students, faculty, and administrators registered under the Vikasana Foundation's affiliated institutions.`,
  },
  {
    icon: Users,
    title: "2. User Eligibility",
    body: `The App is intended for:\n• Students enrolled at AICTE/VTU affiliated institutions partnered with Vikasana Foundation.\n• Faculty members and administrators approved by the Foundation.\n\nYou must be at least 18 years old to provide your own consent for personal data processing. If you are below 18 years of age, use of the platform and any biometric or face-based verification features must be supported by valid parent/guardian consent and any applicable institutional authorisation.`,
  },
  {
    icon: Camera,
    title: "3. Activity Participation, Selfie Capture & Verification",
    body: `When participating in events:\n• You must physically be present at the designated event location.\n• Photo submissions must genuinely reflect your participation — submitting false or misleading photos is a violation of these terms.\n• GPS location data is collected at the time of photo submission solely for event verification purposes.\n• The minimum required photos per event is set by the administrator (typically 3–5).\n\nFor identity verification and misuse prevention, the App may collect and process your selfie photographs and face enrollment images for face recognition / face matching. This processing is used only for legitimate academic and institutional purposes such as:\n• verifying that the registered student is the same person attending, submitting, or enrolling;\n• preventing impersonation, fake attendance, and fraudulent certificate claims; and\n• supporting academic activity verification, certificate issuance, audit, and grievance review.\n\nBy choosing to continue and giving consent in the App, you expressly agree to this limited use of your selfie photographs and face data for these stated purposes.`,
  },
  {
    icon: Award,
    title: "4. Certificates & Points",
    body: `• Certificates are issued only for approved submissions.\n• Points are calculated based on activity type and participation duration as defined by the Foundation.\n• Vikasana Foundation reserves the right to revoke certificates if fraudulent activity is detected.\n• Certificate numbers follow the format BG/VF/{Month}{Seq}/{AcademicYear} and are unique and non-transferable.`,
  },
  {
    icon: Shield,
    title: "5. Prohibited Conduct",
    body: `You may NOT:\n• Submit photos taken at a different time or location than the actual event.\n• Share your login credentials with other users.\n• Attempt to manipulate GPS data or geofence checks.\n• Use automated tools or bots to interact with the platform.\n• Impersonate another student, faculty member, or administrator.\n• Attempt to bypass selfie, face-matching, or identity verification controls.\n\nViolations may result in immediate account suspension, certificate revocation, and institutional reporting where applicable.`,
  },
  {
    icon: Lock,
    title: "6. Consent, Withdrawal & User Rights",
    body: `Where personal data processing is based on your consent, you may withdraw that consent by contacting us at admin@vikasanafoundation.org or through any in-app mechanism we make available.\n\nHowever, if you withdraw consent for selfie / face-recognition processing, some features that depend on identity verification — including face enrollment, event participation verification, anti-impersonation checks, and certificate-related validation — may become unavailable.\n\nYou may also request access, correction, update, or deletion of your personal data, subject to legal, academic, audit, and fraud-prevention retention requirements.`,
  },
  {
    icon: AlertCircle,
    title: "7. Limitation of Liability",
    body: `Vikasana Foundation provides this platform "as is" without warranties of any kind. We are not liable for:\n• Loss of data due to technical failures.\n• Inaccuracies in GPS-based location checks caused by device limitations.\n• Delays in certificate issuance due to administrative review processes.\n• Verification mismatches caused by poor image quality, low lighting, device limitations, or incorrect user submissions.\n\nOur maximum liability is limited to the value of services directly provided through the platform.`,
  },
  {
    icon: FileText,
    title: "8. Modifications to Terms",
    body: `Vikasana Foundation reserves the right to modify these Terms at any time. Users will be notified of significant changes via the app or registered email. Continued use of the app after changes constitutes acceptance of the revised terms.`,
  },
  {
    icon: Mail,
    title: "9. Contact & Grievances",
    body: `For any concerns regarding these terms, face-data processing, privacy, or platform usage, contact us at:\n\nadmin@vikasanafoundation.org\n\nYou may contact us to withdraw consent, request correction, request deletion where applicable, or raise a grievance regarding personal data processing. We aim to respond to all grievances within 5 working days.`,
  },
];

const PRIVACY_SECTIONS = [
  {
    icon: Eye,
    title: "1. Information We Collect",
    body: `We collect the following data:\n\n• Identity Data: Name, USN, email address, branch, year of study.\n• Biometric / Face Data: Selfie photographs, face enrollment photos, and face-matching related data used solely for identity verification, anti-impersonation checks, and academic activity validation.\n• Location Data: GPS coordinates captured at the time of photo submission during events.\n• Activity Data: Photos, submission timestamps, event participation records.\n• Device Data: Device type and OS version for compatibility, security, and troubleshooting purposes.`,
  },
  {
    icon: Lock,
    title: "2. How We Use Your Data",
    body: `Your data is used exclusively for:\n• Verifying your presence and participation at events.\n• Verifying that the registered user is the actual participant through selfie / face-based matching where enabled.\n• Preventing impersonation, fake attendance, and fraudulent certificate claims.\n• Generating and issuing activity certificates.\n• Calculating activity points for your academic record.\n• Facilitating administrative review, audit, and grievance handling.\n• Sending notifications about new events and submission status.\n\nWe do NOT sell, rent, or share your personal data with third parties for marketing purposes.\n\nYour selfie photographs and face-related data are processed only for specific academic, institutional, security, and verification purposes communicated to you at or before the time of collection.`,
  },
  {
    icon: Camera,
    title: "3. Selfies, Face Recognition & Media",
    body: `The App may require selfie photographs and face enrollment images to enable face recognition / face matching for identity verification.\n\nThese images and related face-verification data are:\n• collected only with your clear consent or other lawful basis available under applicable law;\n• used only for academic and institutional purposes such as identity verification, event participation validation, anti-impersonation checks, certificate integrity, audit, and grievance review;\n• not used for advertising, profiling for unrelated purposes, or sale to third parties;\n• accessible only to authorised personnel, authorised systems, and administrators with a legitimate need to review verification outcomes; and\n• retained only for as long as necessary for the stated purpose, institutional record-keeping, fraud prevention, and legal or audit compliance.\n\nWhere you withdraw consent for such processing, we will stop future consent-based processing as applicable, subject to lawful retention and compliance obligations already in force.`,
  },
  {
    icon: MapPin,
    title: "4. Location Data",
    body: `Location (GPS) data is:\n• Collected only during active event participation when you upload photos.\n• Used to verify you are within the designated event geofence radius.\n• Stored alongside your photo submission as part of the event record.\n• Never tracked in the background — location access is foreground-only.`,
  },
  {
    icon: Shield,
    title: "5. Data Security",
    body: `We implement reasonable security safeguards and access controls, including:\n• encrypted transmission over HTTPS/TLS;\n• role-based access restrictions for authorised personnel;\n• controlled access to stored photos and verification records;\n• logging, monitoring, and audit controls where applicable; and\n• secure storage and restricted handling of personal and verification-related data.\n\nNo method of transmission or storage is completely risk-free, but we take reasonable measures to protect your personal data from unauthorised access, disclosure, alteration, or loss.`,
  },
  {
    icon: Users,
    title: "6. Your Rights",
    body: `Subject to applicable law, you may:\n• request access to the personal data we hold about you;\n• request correction or updating of inaccurate personal data;\n• request deletion of personal data, subject to academic, legal, fraud-prevention, and audit retention requirements;\n• withdraw consent for selfie / face-recognition processing where such processing is based on consent; and\n• raise a grievance regarding personal data processing.\n\nTo exercise these rights, email admin@vikasanafoundation.org.`,
  },
  {
    icon: FileText,
    title: "7. Data Retention",
    body: `• Active account data is retained as long as your account is active.\n• Event participation records, certificates, and related audit records may be retained for institutional and compliance purposes.\n• Selfie photographs and face enrollment / verification data are retained only for as long as necessary for identity verification, fraud prevention, academic validation, grievance handling, and lawful record-keeping.\n• Where deletion is approved and no legal or institutional retention requirement applies, relevant data will be removed within a reasonable period.`,
  },
  {
    icon: Bell,
    title: "8. Consent Notice, Withdrawal & Policy Changes",
    body: `At or before collecting your selfie photographs, face enrollment images, location data, or other personal data, we seek to provide a clear notice describing what data is collected and why it is processed.\n\nWhere processing is based on consent, you may withdraw consent by contacting admin@vikasanafoundation.org or using any in-app option that we may provide. Withdrawal of consent will not affect processing already undertaken lawfully before withdrawal, but it may affect your ability to use features that require identity verification.\n\nWe may update this Privacy Policy periodically. We will notify you of material changes via in-app notification or email. The effective date of the latest version is displayed at the top of this page.`,
  },
];

// ─── FAQ Item ─────────────────────────────────────────────────
function FAQItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  return (
    <View style={faq.item}>
      <TouchableOpacity
        style={faq.header}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <View style={faq.iconWrap}>
          <Icon size={15} color={C.navyMid} strokeWidth={2} />
        </View>
        <Text style={faq.question} numberOfLines={open ? undefined : 2}>
          {item.q}
        </Text>
        {open ? (
          <ChevronUp size={18} color={C.navyMid} strokeWidth={2.5} />
        ) : (
          <ChevronDown size={18} color={C.muted} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {open && (
        <View style={faq.answerWrap}>
          <View style={faq.answerLine} />
          <View style={{ flex: 1 }}>
            <Text style={faq.answer}>{item.a}</Text>
            {item.id === "f8" && (
              <TouchableOpacity
                style={faq.actionBtn}
                onPress={() =>
                  Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=Faculty Registration Request`)
                }
                activeOpacity={0.85}
              >
                <Mail size={14} color={C.white} strokeWidth={2.5} />
                <Text style={faq.actionBtnText}>Email Admin</Text>
                <ExternalLink size={13} color={C.white} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            {item.id === "f9" && (
              <TouchableOpacity
                style={[faq.actionBtn, { backgroundColor: C.gold }]}
                onPress={() => shareCSV(FACULTY_CSV, "Faculty CSV Template")}
                activeOpacity={0.85}
              >
                <Download size={14} color={C.white} strokeWidth={2.5} />
                <Text style={faq.actionBtnText}>Share Faculty Template</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Policy Section ───────────────────────────────────────────
function PolicySection({ section }: { section: typeof TERMS_SECTIONS[0] }) {
  const Icon = section.icon;
  return (
    <View style={pol.section}>
      <View style={pol.titleRow}>
        <View style={pol.iconBox}>
          <Icon size={15} color={C.navyMid} strokeWidth={2} />
        </View>
        <Text style={pol.title}>{section.title}</Text>
      </View>
      <Text style={pol.body}>{section.body}</Text>
    </View>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <View style={faq.catBadge}>
      <Text style={faq.catText}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────
export default function TermsFAQScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("faq");

  const handleEmailAdmin = useCallback(() => {
    Linking.openURL(
      `mailto:${ADMIN_EMAIL}?subject=Faculty Registration - Vikasana Foundation`
    ).catch(() =>
      Alert.alert("Error", "Could not open mail app. Please email: " + ADMIN_EMAIL)
    );
  }, []);

  const categories = [...new Set(FAQ_ITEMS.map((f) => f.category))];

  const TABS: { id: TabType; label: string; Icon: any }[] = [
    { id: "faq", label: "FAQs", Icon: HelpCircle },
    { id: "terms", label: "Terms", Icon: FileText },
    { id: "privacy", label: "Privacy", Icon: Shield },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.decor1} />
        <View style={s.decor2} />
        <View style={s.navRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={C.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle}>Help & Legal</Text>
            <Text style={s.headerSub}>Vikasana Foundation · v1.0</Text>
          </View>
          <View style={s.shieldBadge}>
            <Shield size={16} color={C.gold} strokeWidth={2} />
          </View>
        </View>
        <View style={s.tabRow}>
          {TABS.map(({ id, label, Icon }) => (
            <TouchableOpacity
              key={id}
              style={[s.tab, activeTab === id && s.tabActive]}
              onPress={() => setActiveTab(id)}
              activeOpacity={0.8}
            >
              <Icon
                size={14}
                color={activeTab === id ? C.navy : "rgba(255,255,255,0.6)"}
                strokeWidth={2.5}
              />
              <Text style={[s.tabText, activeTab === id && s.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── FAQ TAB ── */}
        {activeTab === "faq" && (
          <View>
            <View style={s.ctaBanner}>
              <View style={s.ctaIconWrap}>
                <Users size={22} color={C.gold} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>Faculty Registration</Text>
                <Text style={s.ctaSub}>
                  Want to onboard as faculty? Email us and download the CSV template below.
                </Text>
              </View>
            </View>

            <View style={s.ctaActions}>
              <TouchableOpacity
                style={s.ctaBtn}
                onPress={handleEmailAdmin}
                activeOpacity={0.85}
              >
                <Mail size={15} color={C.white} strokeWidth={2.5} />
                <Text style={s.ctaBtnText}>Email Admin</Text>
              </TouchableOpacity>
            </View>

            <View style={s.emailCard}>
              <Mail size={14} color={C.navyMid} strokeWidth={2} />
              <Text style={s.emailText}>{ADMIN_EMAIL}</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`mailto:${ADMIN_EMAIL}`)}
                activeOpacity={0.8}
              >
                <ExternalLink size={14} color={C.navyMid} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* CSV Templates */}
            <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
              <Text style={s.sectionHeading}>📂 CSV Templates</Text>

              {/* Faculty */}
              <View style={s.csvCard}>
                <View style={s.csvCardHeader}>
                  <View style={[s.csvIconBox, { backgroundColor: "#EBF1FB" }]}>
                    <Users size={16} color={C.navyMid} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.csvTitle}>Faculty Template</Text>
                    <Text style={s.csvSubtitle}>
                      For admin bulk-import of faculty accounts
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.csvDownloadBtn}
                    onPress={() => shareCSV(FACULTY_CSV, "Faculty CSV Template")}
                    activeOpacity={0.85}
                  >
                    <Download size={14} color={C.white} strokeWidth={2.5} />
                    <Text style={s.csvDownloadText}>Share</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.csvRow}>
                  {["full_name", "email", "college", "role"].map((col) => (
                    <View key={col} style={s.csvCol}>
                      <Text style={s.csvColText}>{col}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.csvPreviewBox}>
                  <Text style={s.csvPreviewText}>
                    {
                      "full_name,email,college,role\nJohn Doe,john@example.com,ABC College,faculty"
                    }
                  </Text>
                </View>
                <Text style={s.csvHint}>
                  Fill all columns and email the .csv file to admin@vikasanafoundation.org
                </Text>
              </View>

              {/* Student */}
              <View style={[s.csvCard, { marginTop: 10 }]}>
                <View style={s.csvCardHeader}>
                  <View style={[s.csvIconBox, { backgroundColor: "#FEF3C7" }]}>
                    <BookOpen size={16} color={C.gold} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.csvTitle}>Student Template</Text>
                    <Text style={s.csvSubtitle}>For bulk-import of student accounts</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.csvDownloadBtn, { backgroundColor: C.gold }]}
                    onPress={() => shareCSV(STUDENT_CSV, "Student CSV Template")}
                    activeOpacity={0.85}
                  >
                    <Download size={14} color={C.white} strokeWidth={2.5} />
                    <Text style={s.csvDownloadText}>Share</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.csvRow}>
                  {[
                    "name",
                    "usn",
                    "email",
                    "branch",
                    "passout_year",
                    "admitted_year",
                  ].map((col) => (
                    <View key={col} style={s.csvCol}>
                      <Text style={s.csvColText}>{col}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.csvPreviewBox}>
                  <Text style={s.csvPreviewText}>
                    {
                      "name,usn,email,branch,passout_year,admitted_year\nJohn Doe,1VB21CS001,john@college.edu,CSE,2025,2021"
                    }
                  </Text>
                </View>
                <Text style={s.csvHint}>
                  Share with faculty coordinators for bulk student onboarding.
                </Text>
              </View>
            </View>

            {/* FAQ List */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Text style={s.sectionHeading}>Frequently Asked Questions</Text>
              {categories.map((cat) => (
                <View key={cat}>
                  <CategoryBadge label={cat} />
                  {FAQ_ITEMS.filter((f) => f.category === cat).map((item) => (
                    <FAQItem key={item.id} item={item} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── TERMS TAB ── */}
        {activeTab === "terms" && (
          <View style={{ padding: 16 }}>
            <View style={s.docHeader}>
              <Text style={s.docTitle}>Terms & Conditions</Text>
              <Text style={s.docDate}>Effective: March 1, 2026</Text>
              <Text style={s.docIntro}>
                These Terms and Conditions govern your use of the Vikasana Social Activity
                Tracker platform. Please read them carefully before using the application.
              </Text>
            </View>
            {TERMS_SECTIONS.map((sec, i) => (
              <PolicySection key={i} section={sec} />
            ))}
            <TouchableOpacity
              style={s.contactCard}
              onPress={handleEmailAdmin}
              activeOpacity={0.85}
            >
              <Mail size={18} color={C.navyMid} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={s.contactTitle}>Questions about these terms?</Text>
                <Text style={s.contactSub}>{ADMIN_EMAIL}</Text>
              </View>
              <ExternalLink size={16} color={C.navyMid} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── PRIVACY TAB ── */}
        {activeTab === "privacy" && (
          <View style={{ padding: 16 }}>
            <View style={s.docHeader}>
              <Text style={s.docTitle}>Privacy Policy</Text>
              <Text style={s.docDate}>Effective: March 1, 2026</Text>
              <Text style={s.docIntro}>
                Vikasana Foundation is committed to protecting your personal data. This
                Privacy Policy explains how we collect, use, and safeguard information
                obtained through the Social Activity Tracker platform.
              </Text>
            </View>
            {PRIVACY_SECTIONS.map((sec, i) => (
              <PolicySection key={i} section={sec} />
            ))}
            <View style={s.gdprBadge}>
              <Shield size={16} color={C.success} strokeWidth={2} />
              <Text style={s.gdprText}>
                We follow responsible data practices aligned with the Digital Personal Data
                Protection Act, 2023, and applicable Indian information technology laws and
                rules.
              </Text>
            </View>
            <TouchableOpacity
              style={s.contactCard}
              onPress={handleEmailAdmin}
              activeOpacity={0.85}
            >
              <Mail size={18} color={C.navyMid} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={s.contactTitle}>Privacy concerns or data requests?</Text>
                <Text style={s.contactSub}>{ADMIN_EMAIL}</Text>
              </View>
              <ExternalLink size={16} color={C.navyMid} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy },
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    overflow: "hidden",
  },
  decor1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: C.navyLight,
    opacity: 0.1,
  },
  decor2: {
    position: "absolute",
    bottom: -10,
    right: 60,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.gold,
    opacity: 0.08,
  },
  navRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },
  shieldBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(201,149,42,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.3)",
  },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabActive: { backgroundColor: C.white, borderColor: C.white },
  tabText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  tabTextActive: { color: C.navy },
  ctaBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: C.navy,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(201,149,42,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(201,149,42,0.3)",
  },
  ctaTitle: { color: C.white, fontSize: 14, fontWeight: "800" },
  ctaSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  ctaActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: C.navyMid,
  },
  ctaBtnText: { color: C.white, fontSize: 13, fontWeight: "700" },
  emailCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: C.sageLight,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.sage,
  },
  emailText: { flex: 1, color: C.navyMid, fontSize: 13, fontWeight: "600" },
  csvCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  csvCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  csvIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  csvTitle: { color: C.ink, fontSize: 13, fontWeight: "800" },
  csvSubtitle: { color: C.muted, fontSize: 11, marginTop: 1 },
  csvDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.navyMid,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexShrink: 0,
  },
  csvDownloadText: { color: C.white, fontSize: 11, fontWeight: "700" },
  csvRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  csvCol: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.sageLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.sage,
  },
  csvColText: {
    color: C.navyMid,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  csvPreviewBox: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  csvPreviewText: {
    color: "#86EFAC",
    fontSize: 10,
    lineHeight: 16,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  csvHint: { color: C.muted, fontSize: 11, lineHeight: 16 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: C.ink,
    marginBottom: 12,
    marginTop: 4,
  },
  docHeader: {
    backgroundColor: C.navy,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
  },
  docTitle: { color: C.white, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  docDate: { color: C.gold, fontSize: 12, fontWeight: "600", marginBottom: 12 },
  docIntro: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 20 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.sageLight,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.sage,
  },
  contactTitle: { color: C.ink, fontSize: 13, fontWeight: "700" },
  contactSub: { color: C.navyMid, fontSize: 12, marginTop: 2 },
  gdprBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  gdprText: { flex: 1, color: "#15803D", fontSize: 12, lineHeight: 18 },
});

const faq = StyleSheet.create({
  item: {
    backgroundColor: C.white,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  question: {
    flex: 1,
    color: C.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  answerWrap: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  answerLine: { width: 3, borderRadius: 2, backgroundColor: C.sage, flexShrink: 0 },
  answer: { color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.navyMid,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  actionBtnText: { color: C.white, fontSize: 12, fontWeight: "700" },
  catBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.navy,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  catText: { color: C.white, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
});

const pol = StyleSheet.create({
  section: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.sageLight,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: C.navy, fontSize: 14, fontWeight: "800", flex: 1 },
  body: { color: C.muted, fontSize: 13, lineHeight: 21 },
});