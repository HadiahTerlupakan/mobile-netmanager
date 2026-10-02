/** Peran akun investor dari server (`user.role`); investor bukan karyawan/mitra/pelanggan. */
export const PERAN_INVESTOR = 'INVESTOR';

export const ENDPOINT_RINGKASAN_INVESTOR = '/api/mobile/investor/dashboard';
export const ENDPOINT_PROYEK_INVESTOR = '/api/mobile/investor/projects';
export const ENDPOINT_SETORAN_INVESTOR = '/api/mobile/investor/deposits';
export const ENDPOINT_BAGI_HASIL_INVESTOR = '/api/mobile/investor/profit-shares';
export const ENDPOINT_PENCAIRAN_INVESTOR = '/api/mobile/investor/payouts';

/** Jumlah riwayat uang diterima per halaman (server membatasi maksimal 50). */
export const UKURAN_HALAMAN_PENCAIRAN = 20;

/** Warna makna sebuah status: hijau selesai, kuning menunggu, merah gagal, abu lain-lain. */
export type NadaStatus = 'berhasil' | 'menunggu' | 'gagal' | 'netral';

export interface TampilanStatus {
  label: string;
  nada: NadaStatus;
}

export const STATUS_SETORAN: Readonly<Record<string, TampilanStatus>> = {
  PENDING: { label: 'Menunggu dicek', nada: 'menunggu' },
  VERIFIED: { label: 'Sudah dicek', nada: 'menunggu' },
  COMPLETED: { label: 'Diterima', nada: 'berhasil' },
  REJECTED: { label: 'Ditolak', nada: 'gagal' },
};

export const JENIS_SETORAN: Readonly<Record<string, string>> = {
  MODAL_AWAL: 'Modal awal',
  TAMBAHAN_MODAL: 'Tambahan modal',
  PINJAMAN: 'Pinjaman',
};

export const STATUS_BAGI_HASIL: Readonly<Record<string, TampilanStatus>> = {
  CALCULATED: { label: 'Sedang dihitung', nada: 'netral' },
  APPROVED: { label: 'Siap dibayar', nada: 'menunggu' },
  PAID: { label: 'Sudah dibayar', nada: 'berhasil' },
};

export const STATUS_PENCAIRAN: Readonly<Record<string, TampilanStatus>> = {
  COMPLETED: { label: 'Sudah dikirim', nada: 'berhasil' },
  PENDING: { label: 'Sedang diproses', nada: 'menunggu' },
};

export const STATUS_PROYEK: Readonly<Record<string, TampilanStatus>> = {
  DRAFT: { label: 'Rancangan', nada: 'netral' },
  PENDING_APPROVAL: { label: 'Menunggu persetujuan', nada: 'menunggu' },
  APPROVED: { label: 'Disetujui', nada: 'berhasil' },
  REJECTED: { label: 'Ditolak', nada: 'gagal' },
  IN_PROGRESS: { label: 'Berjalan', nada: 'berhasil' },
  COMPLETED: { label: 'Selesai', nada: 'berhasil' },
  CANCELLED: { label: 'Dibatalkan', nada: 'gagal' },
  PENGADAAN: { label: 'Beli barang', nada: 'menunggu' },
  PENGGELARAN_JARINGAN: { label: 'Pasang jaringan', nada: 'menunggu' },
  PENJUALAN: { label: 'Jualan ke pelanggan', nada: 'berhasil' },
};
