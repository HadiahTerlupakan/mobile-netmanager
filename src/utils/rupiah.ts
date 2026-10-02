const FORMAT_RUPIAH = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const SATU_MILIAR = 1_000_000_000;
const SATU_JUTA = 1_000_000;
const SATU_RIBU = 1_000;

/** Angka dari nominal server (bisa string BigInt); tak terbaca → 0. */
export function keAngka(nilai: string | number | null | undefined): number {
  const angka = Number(nilai ?? 0);
  return Number.isFinite(angka) ? angka : 0;
}

/**
 * Rupiah tanpa desimal. Server mengirim nominal besar sebagai string (BigInt);
 * nilai tak terbaca ditampilkan Rp 0 alih-alih "NaN".
 */
export function formatRupiah(nilai: string | number | null | undefined): string {
  return FORMAT_RUPIAH.format(keAngka(nilai));
}

/** Rupiah ringkas untuk sumbu grafik: "Rp 4,5 jt", "Rp 850 rb". */
export function formatRupiahRingkas(nilai: string | number | null | undefined): string {
  const angka = keAngka(nilai);
  const mutlak = Math.abs(angka);
  const format = (n: number, satuan: string) =>
    `Rp ${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${satuan}`;
  if (mutlak >= SATU_MILIAR) return format(angka / SATU_MILIAR, 'M');
  if (mutlak >= SATU_JUTA) return format(angka / SATU_JUTA, 'jt');
  if (mutlak >= SATU_RIBU) return format(angka / SATU_RIBU, 'rb');
  return `Rp ${angka.toLocaleString('id-ID')}`;
}
