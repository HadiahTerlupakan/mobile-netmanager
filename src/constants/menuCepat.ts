import { AppFeature } from '@/constants/features';
import {
  Banknote,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardPlus,
  Clock,
  FilePenLine,
  LucideIcon,
  Map,
  MessageCircle,
  MessageSquareWarning,
  PackageMinus,
  ReceiptText,
  Users,
  WifiOff
} from "lucide-react-native";

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
  | 'presurvei'
  | 'tunggakan'
  | 'pelanggan-saya'
  | 'keluhan'
  | 'pengesahan';

/** Definisi satu tile menu cepat Beranda. */
export interface MenuItem {
  id: IdMenuCepat;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  route: string;
  requiredFeatures: string[];
  /** Menu khusus karyawan internal; tidak ditampilkan sama sekali ke mitra. */
  internalOnly?: boolean;
  /** Sembunyikan (bukan kunci) bila tidak berizin. */
  hideWhenLocked?: boolean;
}

/** Menu karyawan yang tidak berlaku bagi mitra (mitra tanpa absensi/cuti). */
export const MENU_BUKAN_UNTUK_MITRA: readonly IdMenuCepat[] = ['izin', 'lembur'];

export const MENU_ITEMS: MenuItem[] = [
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
  {
    id: 'tunggakan',
    title: "Tunggakan",
    subtitle: "Ingatkan bayar",
    icon: ReceiptText,
    color: "bg-rose-100",
    iconColor: "#e11d48",
    route: "/(app)/pelanggan/tunggakan",
    // Lingkup (milik sendiri/tim/semua) diputuskan server dari izin rencana presurvei.
    requiredFeatures: [AppFeature.PRESURVEI],
    internalOnly: true,
    // Fitur sales. Teknisi tidak akan pernah mendapatkannya, jadi menampilkannya
    // sebagai tile terkunci hanya menambah kerumunan pada menu yang sudah padat.
    hideWhenLocked: true,
  },
  {
    id: 'pelanggan-saya',
    title: "Pelanggan Saya",
    subtitle: "Kontak & status",
    icon: Users,
    color: "bg-indigo-50",
    iconColor: "#4f46e5",
    route: "/(app)/pelanggan/saya",
    requiredFeatures: [AppFeature.PRESURVEI],
    internalOnly: true,
    // Fitur sales; sama seperti Tunggakan.
    hideWhenLocked: true,
  },
  {
    id: 'keluhan',
    title: "Keluhan",
    subtitle: "Lapor & pantau",
    icon: MessageSquareWarning,
    color: "bg-amber-50",
    iconColor: "#d97706",
    route: "/(app)/keluhan",
    requiredFeatures: [AppFeature.PRESURVEI],
    internalOnly: true,
    // Fitur sales: keluhan dilaporkan ATAS NAMA pelanggan, lalu sales yang
    // dikabari perkembangannya (lihat catatan di `keluhan/lapor.tsx`). Teknisi
    // berada di ujung lain alurnya — ia menerima work order hasil keluhan itu,
    // bukan yang melaporkannya. Form laporannya pun menuntut `pelangganId` yang
    // datang dari Pelanggan Saya, yang juga khusus sales.
    hideWhenLocked: true,
  },
  {
    id: 'pengesahan',
    title: "Pengesahan",
    subtitle: "Tanda tangan surat",
    icon: FilePenLine,
    color: "bg-violet-50",
    iconColor: "#7c3aed",
    route: "/(app)/pengesahan",
    // Tanpa izin fitur: tampil hanya bila ada surat untuk pengguna (lihat useStatusMenuCepat).
    requiredFeatures: [],
  },
];
