import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Penjaga tema persona: warna identitas biru (`bg-blue-600`, `#2563eb`) tidak
 * boleh di-hardcode lagi di tampilan karyawan — pakai `useTemaPersona()` dan
 * kelas `utama-*` dari `@/theme`, supaya teknisi/staff/finance/direktur tidak
 * diam-diam kembali biru.
 *
 * Di luar jangkauan (bukan tampilan karyawan atau sengaja tetap biru):
 * - `src/theme/` — sumber palet itu sendiri;
 * - layar pelanggan `app/(customer)/` dan login `app/(auth)/` — tanpa persona karyawan;
 * - layar/komponen mitra (`Mitra*`, `mitra-*`) — tampilan mitra tidak berubah.
 * Biru sebagai warna MAKNA (status, kategori, data) didaftarkan di
 * `PENGECUALIAN_MAKNA` beserta alasannya.
 */

const AKAR = join(__dirname, '../..');
const FOLDER_DIPINDAI = ['app', 'src'];
const EKSTENSI_SUMBER = /\.(ts|tsx)$/;
const POLA_BIRU_IDENTITAS = /\bbg-blue-600\b|#2563eb\b/i;

const JALUR_DI_LUAR_JANGKAUAN: RegExp[] = [
  /^src\/theme\//,
  /^app\/\(customer\)\//,
  /^app\/\(auth\)\//,
  /(^|\/)Mitra[^/]*\.tsx?$/,
  /(^|\/)mitra-[^/]*\.tsx?$/,
];

/** Berkas yang memakai biru sebagai MAKNA, bukan identitas; jalur relatif → alasan. */
const PENGECUALIAN_MAKNA: Record<string, string> = {
  'app/(app)/notifications.tsx': 'warna ikon per jenis notifikasi',
  'src/components/organisms/dashboard/QuickMenu.tsx': 'warna kategori per item menu (Canvasing)',
  'src/components/organisms/topology/DeviceDetailModal.tsx': 'warna jenis perangkat ODC',
  'src/components/organisms/topology/WebMapView.tsx': 'warna penanda ODC di peta',
  'src/components/organisms/topology/topologyHelpers.tsx': 'warna jenis perangkat ODC',
  'src/components/screens/work-order/TimelineTab.tsx': 'warna jenis entri timeline STATUS_CHANGE',
  'src/config/toastConfig.tsx': 'toast info = makna informasi',
};

/** Semua berkas sumber di bawah folder, jalur relatif berpemisah `/`. */
function daftarBerkasSumber(folder: string): string[] {
  return readdirSync(join(AKAR, folder)).flatMap((nama) => {
    const jalur = join(folder, nama);
    if (statSync(join(AKAR, jalur)).isDirectory()) return daftarBerkasSumber(jalur);
    return EKSTENSI_SUMBER.test(nama) ? [jalur.split(sep).join('/')] : [];
  });
}

/** Baris yang memuat biru identitas, berformat `berkas:baris`. */
function cariPemakaianBiru(berkas: string): string[] {
  return readFileSync(join(AKAR, berkas), 'utf8')
    .split('\n')
    .flatMap((baris, indeks) => (POLA_BIRU_IDENTITAS.test(baris) ? [`${berkas}:${indeks + 1}`] : []));
}

const berkasDalamJangkauan = FOLDER_DIPINDAI.flatMap(daftarBerkasSumber).filter(
  (berkas) => !JALUR_DI_LUAR_JANGKAUAN.some((pola) => pola.test(berkas)),
);

describe('penjaga warna identitas persona', () => {
  it('memindai berkas tampilan karyawan', () => {
    expect(berkasDalamJangkauan.length).toBeGreaterThan(100);
  });

  it('tidak ada bg-blue-600 / #2563eb hardcode di tampilan karyawan', () => {
    const pelanggaran = berkasDalamJangkauan
      .filter((berkas) => !(berkas in PENGECUALIAN_MAKNA))
      .flatMap(cariPemakaianBiru);
    expect(pelanggaran).toEqual([]);
  });

  it('setiap pengecualian masih memakai biru (daftar tidak basi)', () => {
    const basi = Object.keys(PENGECUALIAN_MAKNA).filter((berkas) => cariPemakaianBiru(berkas).length === 0);
    expect(basi).toEqual([]);
  });
});
