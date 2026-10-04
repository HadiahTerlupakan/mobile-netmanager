/** Status surat pengesahan secara keseluruhan (sisi server). */
export type StatusSuratPengesahan = 'DRAFT' | 'SENT' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

/** Status satu penanda tangan pada surat. */
export type StatusPenandaTangan = 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED';

/** Kelompok tab daftar: perlu tindakan saya, atau sudah selesai bagi saya. */
export type KelompokPengesahan = 'MENUNGGU' | 'SELESAI';

/** Jumlah surat untuk menu cepat Beranda. */
export interface RingkasanPengesahan {
  /** Surat yang masih menunggu tanda tangan saya dan bisa ditandatangani sekarang. */
  menungguCount: number;
  totalCount: number;
}

/** Satu surat di daftar pengesahan saya. */
export interface PengesahanSaya {
  id: string;
  number: string;
  title: string;
  status: StatusSuratPengesahan;
  mySignerStatus: StatusPenandaTangan;
  canSign: boolean;
  signerCount: number;
  signedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

/** Satu halaman daftar pengesahan saya. */
export interface HalamanPengesahan {
  items: PengesahanSaya[];
  total: number;
  page: number;
  limit: number;
}

/** Penanda tangan pada detail surat. */
export interface PenandaTanganPengesahan {
  id: string;
  name: string;
  role: string | null;
  status: StatusPenandaTangan;
  signedAt: string | null;
  isMe: boolean;
}

/** Detail surat; server menandai saya VIEWED saat detail dibuka. */
export interface DetailPengesahanSaya extends PengesahanSaya {
  /** Dokumen masih boleh dibuka: surat berjalan dan belum kedaluwarsa, atau sudah sah. */
  canViewDocument: boolean;
  description: string | null;
  sourceFileName: string;
  hasSignedFile: boolean;
  cancelReason: string | null;
  signers: PenandaTanganPengesahan[];
}

/** Hasil menandatangani: `completed` = semua pihak sudah tanda tangan, surat sah. */
export interface HasilTandaTanganPengesahan {
  completed: boolean;
}
