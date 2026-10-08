/**
 * Berapa banyak sisa material sebuah work order yang masih boleh dikembalikan.
 *
 * Server menegakkan batas yang sama; perhitungan di sini ada supaya layar
 * menawarkan persis apa yang akan diterima. Kalau keduanya berselisih, teknisi
 * memilih jumlah yang terlihat sah lalu ditolak setelah menekan tombol — bentuk
 * kegagalan yang paling membingungkan di lapangan.
 */

export type AsalPengembalian = 'SISA_MATERIAL' | 'TARIKAN_PELANGGAN';

export interface MaterialWorkOrder {
  barangId: string;
  jumlah: number;
  nama?: string;
  name?: string;
  satuan?: string;
  asal?: AsalPengembalian;
}

export interface SisaBarang {
  barangId: string;
  nama: string;
  satuan: string;
  sisa: number;
}

/**
 * Sisa per barang: yang diambil untuk work order ini dikurangi yang sudah
 * terpasang di pelanggan dan yang sudah dikembalikan.
 *
 * Tarikan pelanggan tidak ikut mengurangi: perangkat yang dicabut dari rumah
 * pelanggan tidak pernah berasal dari pengambilan, jadi memotongkannya ke jatah
 * sisa akan menutup pengembalian yang sah.
 */
export function hitungSisaMaterial(
  diambil: MaterialWorkOrder[] | undefined,
  dikembalikan: MaterialWorkOrder[] | undefined,
  dipakai?: MaterialWorkOrder[] | undefined,
): SisaBarang[] {
  const total = new Map<string, SisaBarang>();

  for (const m of diambil ?? []) {
    if (!m.barangId) continue;
    const sebelumnya = total.get(m.barangId);
    total.set(m.barangId, {
      barangId: m.barangId,
      nama: sebelumnya?.nama ?? m.nama ?? m.name ?? 'Barang',
      satuan: sebelumnya?.satuan ?? m.satuan ?? 'pcs',
      sisa: (sebelumnya?.sisa ?? 0) + m.jumlah,
    });
  }

  for (const m of dikembalikan ?? []) {
    if (!m.barangId || m.asal === 'TARIKAN_PELANGGAN') continue;
    const sebelumnya = total.get(m.barangId);
    if (!sebelumnya) continue;
    total.set(m.barangId, { ...sebelumnya, sisa: sebelumnya.sisa - m.jumlah });
  }

  // Barang yang sudah terpasang di pelanggan tidak mungkin dikembalikan ke
  // gudang. Work order lama tidak punya catatan pemakaian; `undefined` di sana
  // menghasilkan nol, yang artinya perilakunya sama seperti sebelum fitur ini —
  // disengaja, karena menolak pengembalian yang sah lebih buruk daripada
  // melonggarkannya untuk data yang catatannya memang tidak pernah dibuat.
  for (const m of dipakai ?? []) {
    if (!m.barangId) continue;
    const sebelumnya = total.get(m.barangId);
    if (!sebelumnya) continue;
    total.set(m.barangId, { ...sebelumnya, sisa: sebelumnya.sisa - m.jumlah });
  }

  return Array.from(total.values()).filter((b) => b.sisa > 0);
}

interface PilihanPengembalian {
  barangId: string;
  jumlah: number;
  asal: AsalPengembalian;
}

/**
 * Sisa yang masih bisa ditambahkan ke keranjang untuk sebuah barang.
 *
 * Dihitung lintas-baris: satu barang bisa dipilih dua kali dengan kondisi
 * berbeda, dan jatahnya tetap satu. `kecualiIndeks` dipakai saat mengubah
 * jumlah baris yang sudah ada supaya baris itu tidak menghitung dirinya sendiri.
 */
export function sisaTersedia(
  jatahAwal: number,
  pilihan: PilihanPengembalian[],
  barangId: string,
  kecualiIndeks?: number,
): number {
  const sudahDipilih = pilihan.reduce(
    (jumlah, item, idx) =>
      item.barangId === barangId &&
      item.asal === 'SISA_MATERIAL' &&
      idx !== kecualiIndeks
        ? jumlah + item.jumlah
        : jumlah,
    0,
  );

  return jatahAwal - sudahDipilih;
}
