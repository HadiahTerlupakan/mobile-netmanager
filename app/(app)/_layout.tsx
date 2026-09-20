import { Tabs, usePathname, useRouter } from "expo-router";
import {
  ClipboardList,
  DollarSign,
  Home,
  Package,
  ScanLine,
  User,
  Wallet,
} from "lucide-react-native";
import { Fragment, useEffect, useState } from "react";
import { Alert } from "react-native";
import tw from "twrnc";

import { FaceVerificationModal } from '@/components/organisms/FaceVerificationModal';
import { LocationDisclosureProvider } from '@/components/providers/LocationDisclosureProvider';
import { MitraSalesTabBar } from '@/components/organisms/navigation/MitraSalesTabBar';
import { MitraTeknisiTabBar } from '@/components/organisms/navigation/MitraTeknisiTabBar';
import { AppFeature } from "@/constants/features";
import { useAuth } from "@/context/AuthContext";
import { useProfileSync } from "@/hooks/useProfileSync";
import { isRouteAllowedDuringLeave } from '@/utils/leaveAccess';
import { logger } from "@/utils/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_DASHBOARD_ROUTE = "/(app)/dashboard";

export default function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // This hook ensures Profile Data is background-synced on App Load/Active
  const { profileData } = useProfileSync({ enableBackgroundSync: true });
  const { user } = useAuth();

  const [showFaceVerification, setShowFaceVerification] = useState(false);

  // Check if camera is required
  useEffect(() => {
    // Check both Auth context and fresh profile data
    if (user?.requiresFaceVerification || profileData?.requiresFaceVerification) {
      setShowFaceVerification(true);
    } else {
      setShowFaceVerification(false);
    }
  }, [user?.requiresFaceVerification, profileData?.requiresFaceVerification]);

  useEffect(() => {
    logger.info("[Layout] User State loaded");
    if (__DEV__) {
      logger.info("[Layout] isSales:", user?.isSales);
      logger.info("[Layout] employeeType:", user?.employeeType);
    }
  }, [user?.employeeType, user?.isSales]);

  const isMitra = user?.employeeType === 'MITRA_TEKNISI' || user?.employeeType === 'MITRA_SALES';

  // Helper to check features
  const hasFeature = (feature: AppFeature | string) => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true; // Safety fallback
    return user.features?.includes(feature) ?? false;
  };

  // Enforce leave restrictions globally
  useEffect(() => {
    if (user?.isOnLeave) {
      // Allow dashboard and chat related routes
      // Also allow null/undefined pathname during initial load
      if (!pathname) return;

      const isAllowed = isRouteAllowedDuringLeave(pathname);

      if (!isAllowed) {
        // Redirect to dashboard if user is on restricted screen
        router.replace(APP_DASHBOARD_ROUTE);
      }
    }
  }, [user?.isOnLeave, pathname, router]);

  // Auto-resume location tracking on app startup if user is checked in
  useEffect(() => {
    const resumeTrackingIfNeeded = async () => {
      // Logic for tracking
    };
    resumeTrackingIfNeeded();
  }, []);

  const handleTabPress = (e: any, feature: AppFeature | string) => {
    // Check for leave status
    if (user?.isOnLeave && feature !== AppFeature.DASHBOARD && feature !== AppFeature.IZIN) {
      e.preventDefault();
      Alert.alert(
        "Mode Cuti Aktif",
        "Fitur ini dinonaktifkan karena Anda sedang cuti.",
        [{
          text: "OK",
          onPress: () => router.replace(APP_DASHBOARD_ROUTE)
        }],
      );
      return;
    }

    // Mitra users have fixed menus — no permission check needed
    if (isMitra) return;

    if (feature !== AppFeature.PROFILE && !hasFeature(feature)) {
      e.preventDefault();
      Alert.alert(
        "Akses Terbatas",
        "Anda tidak memiliki izin untuk mengakses fitur ini. Hubungi administrator.",
        [{ text: "OK" }],
      );
    }
  };

  const getIconColor = (color: string, feature: AppFeature | string) => {
    return hasFeature(feature) ? color : "#9ca3af"; // gray-400 if locked
  };

  return (
    <LocationDisclosureProvider>
      <Fragment>
        <FaceVerificationModal
          visible={showFaceVerification}
          onVerificationComplete={() => setShowFaceVerification(false)}
        />

      <Tabs
        tabBar={
          user?.employeeType === 'MITRA_SALES'
            ? (props) => <MitraSalesTabBar {...props} />
            : user?.employeeType === 'MITRA_TEKNISI'
              ? (props) => <MitraTeknisiTabBar {...props} />
              : undefined
        }
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            ...tw`bg-white border-t border-gray-200`,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: "#2563eb", // blue-600
          tabBarInactiveTintColor: "#9ca3af", // gray-400
          tabBarLabelStyle: tw`text-xs font-medium mb-1`,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Beranda",
            tabBarIcon: ({ color }) => (
              <Home size={24} color={getIconColor(color, AppFeature.DASHBOARD)} />
            ),
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.DASHBOARD),
          }}
        />
        <Tabs.Screen
          name="work-order"
          options={{
            title: "Work Order",
            href: hasFeature(AppFeature.WORK_ORDER) ? "/work-order" : null,
            tabBarIcon: ({ color }) => (
              <ClipboardList size={24} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.WORK_ORDER),
          }}
        />
        <Tabs.Screen
          name="marketing/canvasing/index"
          options={{
            title: "Canvasing",
            href:
              hasFeature(AppFeature.CANVASING) && user?.isSales
                ? "/marketing/canvasing"
                : null,
            tabBarIcon: ({ color }) => (
              <DollarSign
                size={24}
                color={getIconColor(color, AppFeature.CANVASING)}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.CANVASING),
          }}
        />
        <Tabs.Screen
          name="barang"
          options={{
            title: "Barang",
            href: isMitra ? null : (hasFeature(AppFeature.BARANG) ? "/barang" : null),
            tabBarIcon: ({ color }) => (
              <Package
                size={24}
                color={hasFeature(AppFeature.BARANG) ? color : "#9ca3af"}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.BARANG),
          }}
        />
        <Tabs.Screen
          name="absensi"
          options={{
            title: "Absensi",
            href: isMitra ? null : (hasFeature(AppFeature.ABSENSI) ? "/absensi" : null),
            tabBarIcon: ({ color }) => (
              <ScanLine size={24} color={getIconColor(color, AppFeature.ABSENSI)} />
            ),
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.ABSENSI),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => <User size={24} color={color} />,
          }}
          listeners={{
            tabPress: (e) => handleTabPress(e, AppFeature.PROFILE),
          }}
        />

        {/* Mitra Wallet Tab - Only for MITRA users */}
        <Tabs.Screen
          name="mitra-wallet"
          options={{
            title: "Wallet",
            href: isMitra ? ("/mitra-wallet" as any) : null,
            tabBarIcon: ({ color }) => (
              <Wallet size={24} color={color} />
            ),
          }}
        />

        {/* Hidden Screens */}
        <Tabs.Screen
          name="history"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="work-order-detail/[id]"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="ambil-barang/[id]"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="lembur"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="izin"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="topology-map"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="pelanggan/isolir"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="complete-work-order/[id]"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="kembalikan-barang/[id]"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        {/* Chat Screens - Hidden from tab bar, accessed via QuickMenu */}
        <Tabs.Screen
          name="chat/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chat/[conversationId]"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="chat/new"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="holidays"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="change-password"
          options={{
            href: null,
          }}
        />

        {/* Mitra Withdraw - Hidden, accessed from wallet */}
        <Tabs.Screen
          name="mitra-withdraw"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        {/* ID Card WebView Screen */}
        <Tabs.Screen
          name="id-card/[id]"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        {/* Work Order - Moved to dynamic tab slot above */}

        {/* Marketing / Canvasing Screens - Hidden from tab bar */}
        <Tabs.Screen
          name="marketing/canvasing/create"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="marketing/canvasing/[id]/index"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="marketing/canvasing/[id]/claim"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />

        {/* WO Request Screen - Hidden from tab bar, accessed via WO list */}
        <Tabs.Screen
          name="request-work-order"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Announcement Popup - shows after login */}
      {/* <AnnouncementPopup /> */}
      </Fragment>
    </LocationDisclosureProvider>
  );
}
