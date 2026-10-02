import { Linking } from 'react-native';

const KODE_NEGARA = '62';

/** Nomor HP lokal ("0812…", "812…", "+62 812…") menjadi format WhatsApp "62812…". */
export function nomorWhatsApp(nomor: string): string {
  const angka = nomor.replace(/\D/g, '');
  if (angka.startsWith('0')) return `${KODE_NEGARA}${angka.slice(1)}`;
  if (angka.startsWith('8')) return `${KODE_NEGARA}${angka}`;
  return angka;
}

/** Buka WhatsApp ke nomor itu; tanpa WhatsApp jatuh ke panggilan telepon biasa. */
export function hubungiKontak(nomor: string): void {
  Linking.openURL(`whatsapp://send?phone=${nomorWhatsApp(nomor)}`).catch(() => {
    void Linking.openURL(`tel:${nomor}`);
  });
}

/** Buka alamat di Google Maps. */
export function bukaAlamatDiPeta(alamat: string): void {
  void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}`);
}

const MS_SEHARI = 24 * 60 * 60 * 1000;

/** Jumlah hari kalender lewat dari jatuh tempo (0 bila belum lewat atau tanggal tak terbaca). */
export function hariLewatJatuhTempo(jatuhTempo: string, sekarang: Date = new Date()): number {
  const tempo = new Date(jatuhTempo);
  if (Number.isNaN(tempo.getTime())) return 0;
  const awalHari = (waktu: Date) => Date.UTC(waktu.getFullYear(), waktu.getMonth(), waktu.getDate());
  return Math.max(0, Math.round((awalHari(sekarang) - awalHari(tempo)) / MS_SEHARI));
}
