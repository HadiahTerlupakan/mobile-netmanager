import { AppFeature } from '@/constants/features';
import { Href, useRouter } from "expo-router";
import {
  Banknote,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardPlus,
  Clock,
  Lock,
  LucideIcon,
  Map,
  MessageCircle,
  PackageMinus,
  WifiOff
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

/** Id stabil tiap menu cepat; dipakai `menuIds` dan sebagai `key`. */
export type IdMenuCepat =
  | 'request-wo'
  | 'topology'
  | 'barang-keluar'
  | 'izin'
  | 'lembur'
  | 'chat'
  | 'holidays'
  | 'canvasing'
  | 'isolir'
  | 'presurvei';

interface QuickMenuProps {
  features?: string[];
  isSales?: boolean;
  role?: string;
  isMitra?: boolean;
  /** Bila diisi, hanya menu ini yang tampil (izin tetap diperiksa). */
  menuIds?: readonly IdMenuCepat[];
}

interface MenuItem {
  id: IdMenuCepat;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  route: string;
  requiredFeatures: string[];
  requiresSales?: boolean;
  /** Menu khusus karyawan internal; tidak ditampilkan sama sekali ke mitra. */
  internalOnly?: boolean;
  /** Sembunyikan (bukan kunci) bila tidak berizin. */
  hideWhenLocked?: boolean;
}

/** Menu karyawan yang tidak berlaku bagi mitra (mitra tanpa absensi/cuti). */
const MENU_BUKAN_UNTUK_MITRA: readonly IdMenuCepat[] = ['izin', 'lembur'];

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'request-wo',
    title: "Request WO",
    subtitle: "Ajukan Tiket",
    icon: ClipboardPlus,
    color: "bg-sky-50",
    iconColor: "#0284c7",
    route: "/(app)/request-work-order",
    requiredFeatures: [AppFeature.WORK_ORDER], // Permission validated: m_work_order
  },
  {
    id: 'topology',
    title: "Topology Map",
    subtitle: "Peta Jaringan",
    icon: Map,
    color: "bg-cyan-50",
    iconColor: "#0891b2",
    route: "/(app)/topology-map",
    requiredFeatures: [AppFeature.TOPOLOGY],
  },
  {
    id: 'barang-keluar',
    title: "Barang Keluar",
    subtitle: "Ambil stok",
    icon: PackageMinus,
    color: "bg-orange-50",
    iconColor: "#ea580c",
    route: "/(app)/barang/keluar",
    requiredFeatures: [AppFeature.BARANG_KELUAR],
  },
  {
    id: 'izin',
    title: "Izin & Cuti",
    subtitle: "Sakit, Cuti",
    icon: Calendar,
    color: "bg-teal-50",
    iconColor: "#0d9488",
    route: "/(app)/izin",
    requiredFeatures: [AppFeature.IZIN],
  },

  {
    id: 'lembur',
    title: "Lembur",
    subtitle: "Ajukan Lembur",
    icon: Clock,
    color: "bg-indigo-50",
    iconColor: "#4f46e5",
    route: "/(app)/lembur",
    requiredFeatures: [AppFeature.LEMBUR],
  },
  {
    id: 'chat',
    title: "Chat",
    subtitle: "Pesan & Diskusi",
    icon: MessageCircle,
    color: "bg-purple-50",
    iconColor: "#9333ea",
    route: "/(app)/chat",
    requiredFeatures: [AppFeature.CHAT],
  },
  {
    id: 'holidays',
    title: "Kalender Libur",
    subtitle: "Hari Libur",
    icon: CalendarDays,
    color: "bg-red-50",
    iconColor: "#dc2626",
    route: "/(app)/holidays",
    requiredFeatures: [AppFeature.HOLIDAYS],
  },
  {
    id: 'canvasing',
    title: "Canvasing",
    subtitle: "Marketing",
    icon: Banknote,
    color: "bg-blue-50",
    iconColor: "#2563eb",
    route: "/(app)/marketing/canvasing",
    requiredFeatures: [AppFeature.CANVASING],
    requiresSales: true,
  },
  {
    id: 'presurvei',
    title: "Presurvei",
    subtitle: "Kunjungan & Prospek",
    icon: ClipboardCheck,
    color: "bg-emerald-50",
    iconColor: "#059669",
    route: "/(app)/presurvei",
    requiredFeatures: [AppFeature.PRESURVEI],
    // Presurvei untuk teknisi hanya lewat izin role; mitra tidak memakainya.
    internalOnly: true,
    hideWhenLocked: true,
  },
  {
    id: 'isolir',
    title: "Isolir",
    subtitle: "Pelanggan",
    icon: WifiOff,
    color: "bg-red-100",
    iconColor: "#dc2626",
    route: "/(app)/pelanggan/isolir",
    requiredFeatures: [AppFeature.PELANGGAN],
    // Data billing pelanggan tidak boleh terekspos ke mitra eksternal.
    internalOnly: true,
  },
];

const QuickMenuComponent = ({
  features = [],
  isSales = false,
  role,
  isMitra = false,
  menuIds,
}: QuickMenuProps) => {
  const router = useRouter();

  // Check if user has a specific feature
  const hasFeature = useCallback((requiredFeatures: string[]) => {
    if (role === "SUPER_ADMIN") return true;
    if (isMitra) return true; // Mitra has fixed menus — no permission check needed
    if (requiredFeatures.length === 0) return true;
    return requiredFeatures.some((f) => features.includes(f));
  }, [role, features, isMitra]);

  const processedMenuItems = useMemo(
    () =>
      MENU_ITEMS
        .filter((item) => !isMitra || (!item.internalOnly && !MENU_BUKAN_UNTUK_MITRA.includes(item.id)))
        .filter((item) => menuIds === undefined || menuIds.includes(item.id))
        .map((item) => ({
          ...item,
          enabled: hasFeature(item.requiredFeatures) && (!item.requiresSales || isSales),
        }))
        .filter((item) => item.enabled || !item.hideWhenLocked),
    [hasFeature, isSales, isMitra, menuIds],
  );

  const handleMenuPress = useCallback((item: MenuItem & { enabled: boolean }) => {
    if (item.enabled) {
      router.push(item.route as Href);
    } else {
      // Optional: Add specific message for sales restriction vs general permission
      const message = item.requiresSales && !isSales
        ? "Fitur ini hanya dapat diakses oleh Sales yang aktif."
        : "Anda tidak memiliki izin untuk mengakses fitur ini. Hubungi administrator untuk mendapatkan akses.";

      Alert.alert("Akses Terbatas", message, [{ text: "OK" }]);
    }
  }, [router, isSales]);

  return (
    <View style={tw`px-4 pb-8`}>
      <Text style={tw`text-lg font-bold text-gray-900 mb-3 ml-1`}>
        Menu Cepat
      </Text>
      <View style={tw`flex-row flex-wrap justify-between`}>
        {processedMenuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleMenuPress(item)}
            style={tw`w-[31%] mb-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-center ${!item.enabled ? "opacity-50" : ""}`}
          >
            <View
              style={tw`h-10 w-10 rounded-lg ${item.enabled ? item.color : "bg-gray-100"} items-center justify-center mb-2 relative`}
            >
              <item.icon
                size={20}
                color={item.enabled ? item.iconColor : "#9ca3af"}
              />
              {!item.enabled && (
                <View
                  style={tw`absolute -bottom-1 -right-1 bg-gray-400 rounded-full p-0.5`}
                >
                  <Lock size={10} color="white" />
                </View>
              )}
            </View>
            <Text
              style={tw`font-bold ${item.enabled ? "text-gray-900" : "text-gray-400"} text-xs text-center`}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={tw`text-[10px] ${item.enabled ? "text-gray-500" : "text-gray-300"} text-center`}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          </TouchableOpacity>
        )
        )}
      </View>
    </View>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const QuickMenu = React.memo(QuickMenuComponent);
QuickMenu.displayName = 'QuickMenu';
