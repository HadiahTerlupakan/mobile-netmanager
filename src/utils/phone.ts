import { Linking, Platform } from "react-native";

/** Konversi nomor lokal (08xx/8xx) ke format internasional Indonesia (+62). */
export function formatPhoneToInternational(phone: string): string {
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("0")) {
    formatted = "62" + formatted.substring(1);
  } else if (formatted.startsWith("8")) {
    formatted = "62" + formatted;
  }
  return formatted;
}

/** Cek apakah nomor telepon valid (minimal 4 digit). */
export function isValidPhone(phone?: string): boolean {
  return !!phone && phone !== "-" && phone.replace(/\D/g, "").length >= 4;
}

/** Buka WhatsApp dengan nomor tujuan, fallback ke dialer jika WA tidak tersedia. */
export function openWhatsApp(phone: string): void {
  const formatted = formatPhoneToInternational(phone);
  Linking.openURL(`whatsapp://send?phone=${formatted}`).catch(() => {
    Linking.openURL(`tel:${phone}`);
  });
}

/** Buka aplikasi Maps native dengan alamat sebagai query pencarian. */
export function openMaps(address: string): void {
  const url = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(address)}`,
    android: `geo:0,0?q=${encodeURIComponent(address)}`,
  });
  Linking.openURL(
    url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  );
}
