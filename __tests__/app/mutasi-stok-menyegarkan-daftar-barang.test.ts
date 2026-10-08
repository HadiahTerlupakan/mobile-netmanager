import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Layar pengambilan dan pengembalian barang membaca stok gudang lewat query
 * `['barang_list', gudangId]`, dan keduanya mengubah stok itu.
 *
 * Ditemukan saat QA teknisi 8 Okt 2026: keduanya hanya membatalkan
 * `['work_order', id]`. Setelah mengambil 2 meter kabel dari stok 500, layar
 * pemilihan barang dibuka lagi dan tetap menampilkan 500 — padahal basis data
 * sudah 498. Teknisi di lapangan merencanakan pekerjaan di atas angka yang
 * sudah tidak ada, dan tidak ada apa pun di layar yang memberitahunya.
 *
 * `invalidateQueries` mencocokkan awalan kunci, jadi `['barang_list']` saja
 * sudah menyegarkan semua gudang.
 */

const LAYAR_PENGUBAH_STOK = [
  'app/(app)/ambil-barang/[id].tsx',
  'app/(app)/kembalikan-barang/[id].tsx',
] as const;

describe('mutasi stok menyegarkan daftar barang', () => {
  it.each(LAYAR_PENGUBAH_STOK)('%s membatalkan cache barang_list', (berkas) => {
    const isi = readFileSync(join(__dirname, '../..', berkas), 'utf8');

    // Berhenti di `]],` — penutup senarai luar, bukan penutup kunci pertama.
    const blokInvalidate = isi.match(/invalidateKeys:[\s\S]*?\]\]\s*,/)?.[0];

    expect(blokInvalidate).toBeDefined();
    expect(blokInvalidate).toContain("'barang_list'");
  });

  // Penjaga arah sebaliknya: kalau kunci querynya diganti nama, tes di atas
  // akan tetap hijau sambil cache yang dibatalkan menunjuk ke tempat kosong.
  it.each(LAYAR_PENGUBAH_STOK)('%s membaca stok dari kunci yang sama', (berkas) => {
    const isi = readFileSync(join(__dirname, '../..', berkas), 'utf8');

    expect(isi).toMatch(/queryKey:\s*\['barang_list'/);
  });
});
