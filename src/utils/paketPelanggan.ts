import type { BandwidthPaket, PilihanUpgrade } from '@/types/portalPelanggan';

const LABEL_SATUAN_DURASI: Record<string, string> = {
  HARI: 'hari',
  MINGGU: 'minggu',
  BULAN: 'bulan',
  TAHUN: 'tahun',
};

/** Periode tagihan paket, mis. "bulan" untuk 1 BULAN atau "30 hari". */
export function formatPeriodePaket(durasi: number, durasiUnit: string): string {
  const satuan = LABEL_SATUAN_DURASI[durasiUnit] ?? durasiUnit.toLowerCase();
  return durasi === 1 ? satuan : `${durasi} ${satuan}`;
}

/** Kecepatan paket dalam satu baris, mis. "20M turun / 5M naik"; tanpa angka → nama profil bandwidth. */
export function ringkasBandwidth(bandwidth: BandwidthPaket | null): string | null {
  if (!bandwidth) return null;
  if (!bandwidth.download && !bandwidth.upload) return bandwidth.nama;
  return `${bandwidth.download ?? '-'} turun / ${bandwidth.upload ?? '-'} naik`;
}

/** Pilihan awal: paket unggulan bila ada, selain itu yang pertama (termurah). */
export function idPilihanAwal(pilihan: PilihanUpgrade[]): string | null {
  return (pilihan.find((paket) => paket.isFeatured) ?? pilihan[0])?.id ?? null;
}

/** Server menolak pengajuan upgrade dari pelanggan yang tidak AKTIF. */
export const ALASAN_UPGRADE_BUTUH_AKTIF = 'Upgrade bisa diajukan saat layanan Anda aktif.';

/** Pengajuan upgrade hanya diterima server saat langganan berstatus AKTIF. */
export function isBolehAjukanUpgrade(statusLangganan: string | undefined): boolean {
  return statusLangganan === 'AKTIF';
}
