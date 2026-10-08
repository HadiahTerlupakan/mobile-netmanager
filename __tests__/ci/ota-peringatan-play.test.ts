import { readFileSync } from 'fs';
import { join } from 'path';

const OTA = readFileSync(
  join(__dirname, '../../.github/workflows/ota.yml'),
  'utf8',
);

/**
 * Langkah "Periksa build target OTA sudah di production" hanya memberi tahu:
 * ia tidak boleh menggagalkan publish, dan sama pentingnya — tidak boleh
 * terlihat seperti kegagalan.
 *
 * Kejadian 8 Okt 2026: Play API membalas 503, langkah itu keluar dengan kode 1,
 * dan run yang OTA-nya terbit normal tetap menampilkan "Annotations: 1 error".
 * Anotasi merah pada run sukses menyita perhatian ke tempat yang salah setiap
 * kali, dan melatih orang mengabaikan anotasi — termasuk yang sungguhan.
 */

describe('peringatan status Play Store pada publish OTA', () => {
  const langkah = OTA.slice(
    OTA.indexOf('Periksa build target OTA sudah di production'),
  );

  it('tidak pernah menggagalkan publish', () => {
    expect(langkah).toContain('continue-on-error: true');
  });

  it('kegagalan Play API keluar sebagai warning, bukan error', () => {
    expect(langkah).toContain('::warning::');
    expect(langkah).toMatch(/exit 0/);
  });

  it('keluaran aslinya tetap dicetak agar sebabnya bisa dibaca', () => {
    // Menelan pesan Play API membuat 503 dan "build belum dipromosikan"
    // tampak sama — padahal yang satu transien dan yang lain perlu tindakan.
    expect(langkah).toMatch(/echo "\$\{keluaran\}"/);
  });
});
