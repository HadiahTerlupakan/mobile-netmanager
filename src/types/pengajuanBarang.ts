/**
 * Bentuk respons GET /api/mobile/inventory/pengajuan (backend:
 * `app/api/mobile/inventory/pengajuan/presentRestockRequest.ts`).
 * Tahap & status dihitung server dengan aturan yang sama dengan halaman admin.
 */

/** Kode status pengajuan dari server. */
export type KodeStatusPengajuan =
  | 'AWAITING_APPROVAL'
  | 'REJECTED'
  | 'NO_ORDER'
  | 'NOT_PURCHASED'
  | 'PURCHASING'
  | 'PURCHASED'
  | 'PARTIAL'
  | 'COMPLETE'
  | 'COMPLETE_SHORT'
  | 'SERVICE_PENDING'
  | 'CANCELLED';

/** Satu barang di pengajuan. */
export interface BarisPengajuanBarang {
  id: string;
  nama: string;
  satuan: string;
  diminta: number;
  satuanDiminta: string;
  /** Null bila belum diputuskan atau ditolak. */
  disetujui: number | null;
  dibeli: number;
  datang: number;
  tidakDatang: number;
  isDitolak: boolean;
  catatanAtasan: string | null;
}

/** Satu pengajuan barang untuk gudang di site pengguna. */
export interface PengajuanBarang {
  id: string;
  nomor: string;
  /** ISO. */
  tanggal: string;
  gudang: string;
  pemohon: string | null;
  status: { kode: KodeStatusPengajuan; label: string; kalimat: string };
  tahap: {
    /** Tahap yang sedang berjalan; null bila pengajuan dibatalkan. */
    sekarang: number | null;
    /** Tahap tempat pengajuan berhenti (ditolak/dibatalkan); null bila tidak. */
    berhentiDi: number | null;
    total: number;
    judul: string[];
  };
  barang: BarisPengajuanBarang[];
  jumlahJasa: number;
}

/** Satu halaman daftar pengajuan. */
export interface HalamanPengajuanBarang {
  data: PengajuanBarang[];
  nextCursor: string | null;
}
