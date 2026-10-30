import { AlertCircle, CheckCircle, Clock, User, XCircle, type LucideIcon } from 'lucide-react-native';

export interface TampilanStatusTiket {
  label: string;
  /** Kelas twrnc warna teks. */
  warnaTeks: string;
  /** Kelas twrnc latar lencana. */
  warnaLatar: string;
  ikon: LucideIcon;
}

const TAMPILAN_STATUS_TIKET: Record<string, TampilanStatusTiket> = {
  OPEN: { label: 'Baru', warnaTeks: 'text-blue-600', warnaLatar: 'bg-blue-100', ikon: AlertCircle },
  IN_PROGRESS: { label: 'Proses', warnaTeks: 'text-orange-600', warnaLatar: 'bg-orange-100', ikon: Clock },
  WAITING_CUSTOMER: { label: 'Menunggu', warnaTeks: 'text-purple-600', warnaLatar: 'bg-purple-100', ikon: User },
  RESOLVED: { label: 'Selesai', warnaTeks: 'text-teal-600', warnaLatar: 'bg-teal-100', ikon: CheckCircle },
  CLOSED: { label: 'Ditutup', warnaTeks: 'text-gray-600', warnaLatar: 'bg-gray-100', ikon: XCircle },
};

/** Label & warna lencana status tiket pelanggan; status tak dikenal tampil apa adanya. */
export function tampilanStatusTiket(status: string): TampilanStatusTiket {
  return (
    TAMPILAN_STATUS_TIKET[status] ?? { label: status, warnaTeks: 'text-gray-600', warnaLatar: 'bg-gray-100', ikon: AlertCircle }
  );
}

/** Pilihan kategori saat membuat tiket. */
export const KATEGORI_TIKET = [
  { label: 'Masalah Teknis', value: 'TECHNICAL' },
  { label: 'Tagihan & Pembayaran', value: 'BILLING' },
  { label: 'Akun Saya', value: 'ACCOUNT' },
  { label: 'Lainnya', value: 'OTHER' },
] as const;

/** Label kategori tiket; kategori tak dikenal tampil apa adanya. */
export function labelKategoriTiket(kategori: string): string {
  return KATEGORI_TIKET.find((item) => item.value === kategori)?.label ?? kategori;
}

/** Status tempat pelanggan tidak bisa lagi membalas maupun menutup tiket. */
export const STATUS_TIKET_DITUTUP = 'CLOSED';

/** Penilaian layanan saat menutup tiket, indeks = bintang - 1. */
export const LABEL_PENILAIAN = ['Tidak Puas', 'Kurang Puas', 'Cukup Puas', 'Puas', 'Sangat Puas'] as const;
