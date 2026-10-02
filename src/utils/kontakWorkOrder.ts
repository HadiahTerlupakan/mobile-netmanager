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
