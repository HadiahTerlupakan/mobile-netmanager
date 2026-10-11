import type { User } from '@/context/AuthContext';

/** Peran yang dikirim server untuk sesi pelanggan (`MobileCustomerAuthService`). */
export const PERAN_PELANGGAN = 'CUSTOMER';

/**
 * Apakah pengguna login sebagai pelanggan (punya grup layar `(customer)` sendiri).
 *
 * Dipakai untuk menahan permukaan khusus karyawan: endpoint karyawan menolak
 * token pelanggan dengan 401, dan penangan 401 global menutup sesi — pelanggan
 * tertendang kembali ke layar login beberapa detik setelah berhasil masuk.
 */
export function isAkunPelanggan(user: Pick<User, 'role'> | null | undefined): boolean {
  return user?.role === PERAN_PELANGGAN;
}
