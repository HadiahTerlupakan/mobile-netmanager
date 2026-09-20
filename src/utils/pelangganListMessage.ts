const FORBIDDEN_STATUS = 403;
const NO_SITE_MESSAGE = "Belum ada site yang ditugaskan ke Anda. Hubungi admin.";
const LOAD_FAILED_MESSAGE = "Gagal memuat data pelanggan.";

interface PelangganListMessageInput {
  isError: boolean;
  error: unknown;
  /** Pesan khas layar ketika pemuatan sukses tapi tidak ada hasil. */
  emptyMessage: string;
}

/**
 * Pesan untuk daftar pelanggan yang tampil kosong. Endpoint yang sama dipakai
 * layar Isolir dan picker Ajukan WO, jadi keduanya wajib membedakan "tidak
 * punya site" (403), gagal memuat, dan hasil yang memang kosong.
 */
export function resolvePelangganListMessage({
  isError,
  error,
  emptyMessage,
}: PelangganListMessageInput): string {
  if (!isError) return emptyMessage;

  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === FORBIDDEN_STATUS ? NO_SITE_MESSAGE : LOAD_FAILED_MESSAGE;
}
