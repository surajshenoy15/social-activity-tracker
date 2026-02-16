import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { Bell, Upload, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";


const { width } = Dimensions.get("window");

export default function Home() {
  const [activeTab, setActiveTab] = useState("My Activities");

  // Sample activity data
  const activities = [
    {
      id: 1,
      title: "Tree Plantation Drive",
      date: "April 15, 2025",
      description: "Participated in a tree plantation drive to promote environmental awareness.",
      image: require("../../assets/images/bg/login_header.png"), // You'll need to add your image
      location: "Tumakuru, West Bengal, India",
      coordinates: "Lat 21.8681150°\nLong 88.3207886°",
      timestamp: "20/04/24 20:17 PM GMT +05:30",
      status: "Pending",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Image
                // source={require("../../assets/images/avatar.png")} // Add default avatar
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
            <View>
              <Text style={styles.greeting}>Hello, Suraj!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#4a6b54" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Hero Background Section */}
        <View style={styles.heroSection}>
          <Image
            // source={require("../../assets/images/bg/home-hero.png")} // Add your background image
            style={styles.heroBackground}
            resizeMode="cover"
          />
          
          {/* Points Card */}
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <View style={styles.iconCircle}>
                <Image
                  // source={require("../../assets/images/icons/trophy.png")} // Add trophy icon
                  style={styles.trophyIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsLabel}>Total Activity Points</Text>
                <Text style={styles.pointsValue}>200 Points</Text>
              </View>
            </View>
            
            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.milestoneText}>Next Milestone: 500 Points</Text>
                <View style={styles.percentageBadge}>
                  <Text style={styles.percentageText}>40%</Text>
                  <ChevronRight size={16} color="#4a6b54" strokeWidth={2.5} />
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: "40%" }]} />
              </View>
            </View>
          </View>

          {/* Upload Activity Button */}
          {/* Create Activity Button */}
<TouchableOpacity
  style={styles.uploadButton}
  onPress={() => router.push("/(student)/create-activity")}
>
  <View style={styles.uploadIconWrapper}>
    <Upload size={22} color="#FFFFFF" strokeWidth={2.5} />
  </View>
  <Text style={styles.uploadButtonText}>Create Activity</Text>
  <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
</TouchableOpacity>


          {/* Institute Badge */}
          <View style={styles.instituteBadge}>
            <View style={styles.instituteIcon}>
              <Image
                // source={require("../../assets/images/icons/institute.png")} // Add institute icon
                style={styles.instituteIconImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.instituteName}>BNM Institute of Technology</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {["My Activities", "Pending", "Approved", "Cert"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activities List */}
        <View style={styles.activitiesContainer}>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{activity.status}</Text>
                </View>
              </View>
              
              <Text style={styles.activityDate}>{activity.date}</Text>
              
              <Text style={styles.activityDescription}>
                {activity.description}
              </Text>

              {/* Activity Image with Location Overlay */}
              <View style={styles.activityImageContainer}>
                <Image
                  source={activity.image}
                  style={styles.activityImage}
                  resizeMode="cover"
                />
                <View style={styles.locationOverlay}>
                  <View style={styles.locationInfo}>
                    <Image
                      // source={require("../../assets/images/icons/google-maps.png")} // Add Google Maps icon
                      style={styles.mapsIcon}
                      resizeMode="contain"
                    />
                    <View style={styles.locationDetails}>
                      <Text style={styles.locationText}>{activity.location}</Text>
                      <Text style={styles.coordinatesText}>{activity.coordinates}</Text>
                      <Text style={styles.timestampText}>{activity.timestamp}</Text>
                    </View>
                  </View>
                  <View style={styles.cameraBadge}>
                    <Image
                      // source={require("../../assets/images/icons/camera.png")} // Add camera icon
                      style={styles.cameraIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.cameraBadgeText}>GPS Map Camera</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4a6b54",
  },
  notificationButton: {
    padding: 8,
  },

  // Hero Section
  heroSection: {
    position: "relative",
    paddingBottom: 20,
  },
  heroBackground: {
    width: "100%",
    height: 280,
    position: "absolute",
    top: 0,
  },

  // Points Card
  pointsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4a6b54",
    justifyContent: "center",
    alignItems: "center",
  },
  trophyIcon: {
    width: 28,
    height: 28,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  percentageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4a6b54",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4a6b54",
    borderRadius: 4,
  },

  // Upload Button
  uploadButton: {
    backgroundColor: "#4a6b54",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#4a6b54",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },

  // Institute Badge
  instituteBadge: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  instituteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  instituteIconImage: {
    width: 20,
    height: 20,
  },
  instituteName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a6b54",
    flex: 1,
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: "#F3F4F6",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#4a6b54",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#4a6b54",
  },

  // Activities
  activitiesContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4a6b54",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  activityDate: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  activityDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 16,
  },
  activityImageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  activityImage: {
    width: "100%",
    height: 240,
  },
  locationOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 12,
  },
  locationInfo: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  mapsIcon: {
    width: 16,
    height: 16,
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 2,
  },
  coordinatesText: {
    fontSize: 10,
    color: "#D1D5DB",
    marginBottom: 2,
  },
  timestampText: {
    fontSize: 10,
    color: "#D1D5DB",
  },
  cameraBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  cameraIcon: {
    width: 14,
    height: 14,
  },
  cameraBadgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});