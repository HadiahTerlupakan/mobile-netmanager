const AKAR = ["portal-pelanggan"] as const;

/**
 * Kunci cache portal pelanggan (sesi CUSTOMER), dipasang di `queryKeys.portalPelanggan`.
 * Berkas sendiri karena `queryClient.ts` sudah di batas panjang berkas.
 */
export const kunciPortalPelanggan = {
  all: AKAR,
  daftarTiket: () => [...AKAR, "tiket", "daftar"] as const,
  tiket: (id: string) => [...AKAR, "tiket", "detail", id] as const,
  profil: () => [...AKAR, "profil"] as const,
  beranda: () => [...AKAR, "beranda"] as const,
  paket: () => [...AKAR, "paket"] as const,
  notifikasi: () => [...AKAR, "notifikasi"] as const,
  jumlahBelumDibaca: () => [...AKAR, "notifikasi", "belum-dibaca"] as const,
  pengumuman: () => [...AKAR, "pengumuman"] as const,
};
