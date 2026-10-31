import type { TampilanStatus } from '@/constants/status';

interface MasukanStatusLayanan {
  statusPelanggan: string | undefined;
  /** Bagian koneksi ringkasan Beranda terbaca (bukan galat server). */
  isKoneksiSiap: boolean;
  isOnline: boolean;
  isAdaTunggakan: boolean;
}

/**
 * Label kartu layanan Beranda, diturunkan sama seperti `getServiceStatusLabel`
 * di portal web agar aplikasi dan portal tidak berbeda untuk pelanggan yang
 * sama. Status pelanggan dibaca lebih dulu: pelanggan isolir tetap online di
 * pool isolir, jadi sesi PPPoE saja menyebutnya "Aktif & Stabil". Isolir tanpa
 * tunggakan (diisolir manual oleh admin) tidak disuruh membayar. Pelanggan
 * dalam perbaikan juga bisa tetap online, dan sesi pelanggan yang dibongkar
 * baru diputus hingga 15 menit kemudian; keduanya tidak boleh disebut sehat.
 */
export function statusLayananPelanggan(masukan: MasukanStatusLayanan): TampilanStatus {
  if (masukan.statusPelanggan === 'ISOLIR') {
    return { label: masukan.isAdaTunggakan ? 'Diisolir – bayar tagihan' : 'Diisolir – hubungi admin/CS', nada: 'gagal' };
  }
  if (masukan.statusPelanggan === 'NONAKTIF') return { label: 'Layanan nonaktif', nada: 'gagal' };
  if (masukan.statusPelanggan === 'MAINTENANCE') return { label: 'Dalam perbaikan teknisi', nada: 'menunggu' };
  if (masukan.statusPelanggan === 'DISMANTLE') return { label: 'Berhenti berlangganan', nada: 'gagal' };
  if (!masukan.isKoneksiSiap) return { label: 'Status perangkat belum tersedia', nada: 'gagal' };
  return masukan.isOnline ? { label: 'Aktif & Stabil', nada: 'berhasil' } : { label: 'Gangguan / Offline', nada: 'gagal' };
}
