import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const PEMULIHAN = readFileSync(join(ROOT, 'scripts/pulihkan-publish-ota.sh'), 'utf8');
const PUBLISH = readFileSync(join(ROOT, 'scripts/publish-update.sh'), 'utf8');
const OTA_WORKFLOW = readFileSync(join(ROOT, '.github/workflows/ota.yml'), 'utf8');

/**
 * Jalur pemulihan publish OTA, dipakai ketika transit runner GitHub ke server
 * merosot sampai bundel 13 MB tidak selesai sebelum batas baca Traefik
 * (7 Okt 2026: ~10 KB/detik, empat kali gagal berturut-turut).
 *
 * Dua sifat di bawah ini yang membuatnya aman, dan keduanya mudah hilang tanpa
 * disadari saat skrip dirapikan nanti:
 *
 * 1. Bundel TIDAK dibangun ulang. Nilai EXPO_PUBLIC_* ditanam saat export, jadi
 *    membangun di mesin lain berarti pengguna bisa menerima konfigurasi Firebase
 *    yang berbeda — cacat OTA 8f311761 yang dulu mematikan chat dan realtime
 *    work order.
 * 2. Penerbitan tetap lewat `publish-update.sh`, bukan curl langsung, supaya
 *    pemeriksaan isi bundel ikut berjalan. Justru ketika bundel datang dari
 *    tempat lain, pemeriksaan itu paling dibutuhkan.
 */

describe('skrip pemulihan publish OTA', () => {
  it('tidak pernah membangun ulang bundel', () => {
    expect(PEMULIHAN).not.toMatch(/expo export/);
  });

  it('memakai bundel yang sudah ada lewat SKIP_EXPORT', () => {
    expect(PEMULIHAN).toMatch(/SKIP_EXPORT=1/);
  });

  it('menerbitkan lewat publish-update.sh, bukan curl langsung', () => {
    expect(PEMULIHAN).toMatch(/publish-update\.sh/);
    expect(PEMULIHAN).not.toMatch(/app-update\/publish/);
  });

  it('mengambil token di host, tidak membawanya ke mesin pemanggil', () => {
    expect(PEMULIHAN).toMatch(/kubectl get secret/);
    // Token hanya boleh dirujuk sebagai variabel, tidak pernah dicetak.
    expect(PEMULIHAN).not.toMatch(/echo .*\$TOKEN/);
  });

  it('membersihkan berkas sementara di kedua sisi', () => {
    expect(PEMULIHAN).toMatch(/trap bersihkan EXIT/);
    expect(PEMULIHAN).toMatch(/rm -rf .*REMOTE_DIR/);
  });
});

describe('SKIP_EXPORT tetap memeriksa isi bundel', () => {
  /**
   * Melewati export tidak boleh ikut melewati penjaga bundel. Urutannya yang
   * menentukan: cabang SKIP_EXPORT harus ditutup SEBELUM pemeriksaan Firebase.
   */
  it('cabang SKIP_EXPORT ditutup sebelum pemeriksaan Firebase', () => {
    // `npx expo export`, bukan sekadar 'expo export' — kata itu juga muncul di
    // komentar kepala berkas, dan mencarinya menggeser seluruh perhitungan.
    const cabang = PUBLISH.indexOf('SKIP_EXPORT');
    const perintahExport = PUBLISH.indexOf('npx expo export');
    const tutupCabang = PUBLISH.indexOf('\nfi\n', perintahExport);
    const periksaWeb = PUBLISH.indexOf('app id Firebase web');

    expect(cabang).toBeGreaterThan(-1);
    expect(perintahExport).toBeGreaterThan(cabang);
    expect(tutupCabang).toBeGreaterThan(cabang);
    expect(periksaWeb).toBeGreaterThan(tutupCabang);
  });

  it('pemeriksaan app id Firebase web dan Android keduanya ada', () => {
    expect(PUBLISH).toMatch(/app id Firebase web/);
    expect(PUBLISH).toMatch(/app id Firebase Android/);
  });
});

describe('workflow menyimpan bundel saat publish gagal', () => {
  it('artifact hanya diunggah pada kegagalan', () => {
    expect(OTA_WORKFLOW).toMatch(/if: failure\(\)/);
    expect(OTA_WORKFLOW).toMatch(/name: ota-dist-/);
  });

  it('artifact memuat dist dan native-build.json', () => {
    expect(OTA_WORKFLOW).toMatch(/dist\//);
    expect(OTA_WORKFLOW).toMatch(/native-build\.json/);
  });
});
