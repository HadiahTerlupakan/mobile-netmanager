import { useRouter } from "expo-router";
import {
    Banknote,
    Calendar,
    CalendarDays,
    ClipboardPlus,
    Clock,
    Lock,
    Map,
    MessageCircle,
    PackageMinus,
    WifiOff
} from "lucide-react-native";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

interface QuickMenuProps {
  features?: string[];
  isSales?: boolean;
}

export const QuickMenu = ({
  features = [],
  isSales = false,
}: QuickMenuProps) => {
  const router = useRouter();

  // Check if user has a specific feature
  const hasFeature = (requiredFeatures: string[]) => {
    if (requiredFeatures.length === 0) return true;
    return requiredFeatures.some((f) => features.includes(f));
  };

  const menuItems = [
    {
      title: "Request WO",
      subtitle: "Ajukan Tiket",
      icon: ClipboardPlus,
      color: "bg-sky-50",
      iconColor: "#0284c7",
      route: "/(app)/request-work-order",
      requiredFeatures: ["m_work_order"],
    },
    {
      title: "Topology Map",
      subtitle: "Peta Jaringan",
      icon: Map,
      color: "bg-cyan-50",
      iconColor: "#0891b2",
      route: "/(app)/topology-map",
      requiredFeatures: ["m_topology_map"],
    },
    {
      title: "Barang Keluar",
      subtitle: "Ambil stok",
      icon: PackageMinus,
      color: "bg-orange-50",
      iconColor: "#ea580c",
      route: "/(app)/barang/keluar",
      requiredFeatures: ["m_barang_keluar"],
    },
    {
      title: "Izin & Cuti",
      subtitle: "Sakit, Cuti",
      icon: Calendar,
      color: "bg-teal-50",
      iconColor: "#0d9488",
      route: "/(app)/izin",
      requiredFeatures: ["m_izin"],
    },

    {
      title: "Lembur",
      subtitle: "Ajukan Lembur",
      icon: Clock,
      color: "bg-indigo-50",
      iconColor: "#4f46e5",
      route: "/(app)/lembur",
      requiredFeatures: ["m_lembur"],
    },
    {
      title: "Chat",
      subtitle: "Pesan & Diskusi",
      icon: MessageCircle,
      color: "bg-purple-50",
      iconColor: "#9333ea",
      route: "/(app)/chat",
      requiredFeatures: ["m_chat"],
    },
    {
      title: "Kalender Libur",
      subtitle: "Hari Libur",
      icon: CalendarDays,
      color: "bg-red-50",
      iconColor: "#dc2626",
      route: "/(app)/holidays",
      requiredFeatures: ["m_holidays"],
    },
    {
      title: "Canvasing",
      subtitle: "Marketing",
      icon: Banknote,
      color: "bg-blue-50",
      iconColor: "#2563eb",
      route: "/(app)/marketing/canvasing",
      requiredFeatures: ["m_canvasing"],
      requiresSales: true,
    },
    {
      title: "Isolir",
      subtitle: "MixRadius",
      icon: WifiOff,
      color: "bg-red-100",
      iconColor: "#dc2626",
      route: "/(app)/mixradius/isolir",
      requiredFeatures: [],
    },
  ];

  const handleMenuPress = (item: any) => {
    const enabled = hasFeature(item.requiredFeatures);

    if (enabled) {
      // Strict Sales Check for Sales Features
      if (item.requiresSales && !isSales) {
        Alert.alert(
          "Akses Terbatas",
          "Fitur ini hanya dapat diakses oleh Sales yang aktif.",
          [{ text: "OK" }],
        );
        return;
      }
      router.push(item.route as any);
    } else {
      Alert.alert(
        "Akses Terbatas",
        "Anda tidak memiliki izin untuk mengakses fitur ini. Hubungi administrator untuk mendapatkan akses.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <View style={tw`px-4 pb-8`}>
      <Text style={tw`text-lg font-bold text-gray-900 mb-3 ml-1`}>
        Menu Cepat
      </Text>
      <View style={tw`flex-row flex-wrap justify-between`}>
        {menuItems.map((item, index) => {
          const enabled = hasFeature(item.requiredFeatures);
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleMenuPress(item)}
              style={tw`w-[31%] mb-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-center ${!enabled ? "opacity-50" : ""}`}
            >
              <View
                style={tw`h-10 w-10 rounded-lg ${enabled ? item.color : "bg-gray-100"} items-center justify-center mb-2 relative`}
              >
                <item.icon
                  size={20}
                  color={enabled ? item.iconColor : "#9ca3af"}
                />
                {!enabled && (
                  <View
                    style={tw`absolute -bottom-1 -right-1 bg-gray-400 rounded-full p-0.5`}
                  >
                    <Lock size={10} color="white" />
                  </View>
                )}
              </View>
              <Text
                style={tw`font-bold ${enabled ? "text-gray-900" : "text-gray-400"} text-xs text-center`}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={tw`text-[10px] ${enabled ? "text-gray-500" : "text-gray-300"} text-center`}
                numberOfLines={1}
              >
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
