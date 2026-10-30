/**
 * Kontrak `/api/customer/*` (portal pelanggan). Nama field mengikuti server
 * apa adanya karena endpoint ini juga dipakai portal web.
 */

export type StatusTiket = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface BalasanTiket {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  sender: { id: string; name: string | null; type: 'admin' | 'customer' } | null;
  /** Jalur relatif `/uploads/...` berkas yang diunggah pelanggan / staf. */
  attachments: string[];
}

export interface LampiranTiket {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface DetailTiket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: StatusTiket;
  priority: string;
  createdAt: string;
  closedAt: string | null;
  rating: number | null;
  attachments: LampiranTiket[];
  replies: BalasanTiket[];
}

export interface MuatanTutupTiket {
  rating?: number;
  feedback?: string;
}

export interface ProfilPelanggan {
  id: string;
  idPelanggan: string;
  nama: string;
  noTelp: string | null;
  preferences: {
    isBillNotifEnabled: boolean;
    isPromoEnabled: boolean;
  };
}

export interface MuatanUbahProfil {
  noTelp: string;
  isBillNotifEnabled: boolean;
  isPromoEnabled: boolean;
}

export interface MuatanGantiPassword {
  currentPassword: string;
  newPassword: string;
}

export interface BandwidthPaket {
  nama: string;
  download: string | null;
  upload: string | null;
}

export interface PilihanUpgrade {
  id: string;
  nama: string;
  harga: number;
  durasi: number;
  durasiUnit: string;
  isFeatured: boolean;
  priceDifference: number;
  bandwidth: BandwidthPaket | null;
}

export interface PengajuanUpgrade {
  id: string;
  nama: string;
  applyAt: string | null;
}

export interface PaketPelanggan {
  package: {
    id: string;
    nama: string;
    harga: number;
    durasi: number;
    durasiUnit: string;
    bandwidth: BandwidthPaket | null;
  };
  subscription: { jatuhTempo: string; status: string };
  pendingUpgrade: PengajuanUpgrade | null;
  upgradeOptions: PilihanUpgrade[];
}

export interface NotifikasiPelanggan {
  id: string;
  type: string;
  title: string;
  message: string;
  preview: string;
  createdAt: string;
  isRead: boolean;
  sender: string;
  /** Hanya ada pada notifikasi balasan tiket (`TICKET_REPLY`). */
  ticketId?: string;
}

export interface RingkasanNotifikasi {
  notifications: NotifikasiPelanggan[];
  /** Pengumuman yang BELUM dibaca pelanggan ini (paling banyak 3). */
  announcements: { id: string }[];
}

export interface Pengumuman {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

/** Status sesi PPPoE terakhir dari `/api/customer/usage`. */
export interface KoneksiPelanggan {
  isOnline: boolean;
  ipAddress: string | null;
  sessionDurationFormatted: string | null;
}

/** Ukuran data dari server: angka mentah dan teks siap tampil, mis. "1.2 GB". */
export interface UkuranData {
  bytes: number;
  formatted: string;
}

export interface PemakaianData {
  download: UkuranData;
  upload: UkuranData;
  total: UkuranData;
}

export interface PemakaianPelanggan {
  monthly: PemakaianData;
  allTime: PemakaianData;
}

/** Pembayaran terakhir sebuah tagihan, dari `GET /api/customer/invoices`. */
export interface PembayaranTerakhir {
  amount: number;
  date: Date | string;
  method: string;
  gatewayStatus?: string | null;
  paymentUrl?: string | null;
  vaNumber?: string | null;
  qrString?: string | null;
  /** Kode channel gateway (mis. "BC"), sama dengan `code` metode pembayaran. */
  gatewayProvider?: string | null;
  receiptUrl?: string | null;
  expiresAt?: Date | string | null;
  accountId?: string | null;
}

export interface TagihanPelanggan {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
  dueDate: string;
  /** API tidak mengirim createdAt; tanggal tagihan adalah tanggal terbitnya. */
  issueDate: string;
  items: { description: string }[];
  lastPayment?: PembayaranTerakhir | null;
}

export interface RekeningTransferManual {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface MetodePembayaranPelanggan {
  id: string;
  name: string;
  provider: string;
  type: string;
  code: string;
  group: string;
  details?: RekeningTransferManual;
}
