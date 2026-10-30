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
