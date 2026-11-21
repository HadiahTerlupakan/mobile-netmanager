/**
 * Bentuk respons GET /api/mobile/inventory/pengajuan (backend:
 * `app/api/mobile/inventory/pengajuan/presentRestockRequest.ts`).
 * Status dihitung server dengan aturan yang sama dengan halaman admin:
 * pengajuan menunggu persetujuan atasan, lalu admin memasukkan barangnya ke
 * gudang. Pengajuan bisa juga ditolak atasan atau dibatalkan admin.
 *
 * Server masih mengirim `tahap` dan angka lama per barang (`dibeli`, `datang`,
 * `tidakDatang`) untuk build lama; aplikasi ini tidak membacanya.
 */

/** Kode status pengajuan dari server. */
export type KodeStatusPengajuan = 'AWAITING_APPROVAL' | 'APPROVED' | 'RECEIVED' | 'REJECTED' | 'CANCELLED';

/** Satu barang di pengajuan. */
export interface BarisPengajuanBarang {
  id: string;
  nama: string;
  /** Satuan barang yang berlaku (barang pengganti bila diganti). */
  satuan: string;
  diminta: number;
  satuanDiminta: string;
  /** Jumlah yang disetujui atasan; null bila belum diputuskan atau ditolak. */
  disetujui: number | null;
  /**
   * Jumlah yang sudah dimasukkan admin ke gudang; null bila belum ada yang
   * dimasukkan. Opsional karena data lama di cache dan respons server lama
   * tidak memilikinya.
   */
  dimasukkan?: number | null;
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
  barang: BarisPengajuanBarang[];
  jumlahJasa: number;
}

/** Satu halaman daftar pengajuan. */
export interface HalamanPengajuanBarang {
  data: PengajuanBarang[];
  nextCursor: string | null;
}
