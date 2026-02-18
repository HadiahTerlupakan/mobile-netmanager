import { Tabs } from "expo-router";
import {
  Home,
  User,
  FileText,
  Signal,
  Box
} from "lucide-react-native";
import { Fragment } from "react";
import tw from "twrnc";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Fragment>
      <Tabs
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
              <Home size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="koneksi/index"
          options={{
            title: "Koneksi",
            tabBarIcon: ({ color }) => (
              <Signal size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tagihan/index"
          options={{
            title: "Tagihan",
            tabBarIcon: ({ color }) => (
              <FileText size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="paket/index"
          options={{
            title: "Paket",
            tabBarIcon: ({ color }) => (
              <Box size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color }) => (
              <User size={24} color={color} />
            ),
          }}
        />
        {/* Hidden Screens - Explicitly disabled from tab bar */}
        <Tabs.Screen
          name="tickets/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="riwayat/index"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </Fragment>
  );
}
