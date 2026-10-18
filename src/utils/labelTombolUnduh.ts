/**
 * Server mengarahkan versi yang sudah ditolak ke halaman Play Store, bukan ke
 * berkas APK; label tombol mengikuti tujuan itu.
 */
export function labelTombolUnduh(downloadUrl: string): string {
  return downloadUrl.includes('play.google.com') ? 'Update di Play Store' : 'Download APK Sekarang';
}
