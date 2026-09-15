import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Semua skrip CI di repo ini berjalan dengan `set -o pipefail`. Dalam mode itu,
 * perintah yang berhenti membaca lebih awal — `grep -q` di kecocokan pertama,
 * `head -1` setelah satu baris — membuat penulis di sisi kiri pipa kena SIGPIPE
 * (exit 141), dan pipefail menganggap seluruh pipa gagal.
 *
 * Run #17 membangun AAB bertanda tangan benar, lalu ditolak karena
 * `printf "$SERTIFIKAT" | grep -q 'jar verified'` gagal pada keluaran jarsigner
 * yang panjang. Di dalam `if`, cacat yang sama berbalik arah: pemeriksaan debug
 * keystore bisa bernilai salah dan meloloskan artefak yang seharusnya ditolak.
 *
 * Pemeriksaan teks dilakukan dengan here-string (`grep -q … <<< "$teks"`) atau
 * awk, tanpa pipa.
 */

const ROOT = join(__dirname, '../..');

function berkasSkrip(): { jalur: string; isi: string }[] {
  const daftar: string[] = [];
  for (const nama of readdirSync(join(ROOT, '.gitea/workflows'))) {
    if (nama.endsWith('.yml')) daftar.push(join('.gitea/workflows', nama));
  }
  for (const nama of readdirSync(join(ROOT, 'scripts'))) {
    if (nama.endsWith('.sh')) daftar.push(join('scripts', nama));
  }
  return daftar.map((jalur) => ({ jalur, isi: readFileSync(join(ROOT, jalur), 'utf8') }));
}

function barisBerpola(isi: string, pola: RegExp): string[] {
  return isi
    .split('\n')
    .filter((baris) => !baris.trim().startsWith('#'))
    .filter((baris) => pola.test(baris));
}

describe('keamanan pipefail', () => {
  it('tidak memakai grep -q di ujung pipa', () => {
    for (const { jalur, isi } of berkasSkrip()) {
      expect({ jalur, baris: barisBerpola(isi, /\|\s*grep\s+-[a-zA-Z]*q/) }).toEqual({ jalur, baris: [] });
    }
  });

  it('tidak memotong pipa dengan head', () => {
    for (const { jalur, isi } of berkasSkrip()) {
      expect({ jalur, baris: barisBerpola(isi, /\|\s*head\b/) }).toEqual({ jalur, baris: [] });
    }
  });

  it('here-string memang lolos di tempat pipa gagal', () => {
    // Bukti bahwa pola pengganti tidak sekadar lolos tes teks: dijalankan
    // sungguhan dengan keluaran sepanjang jarsigner pada AAB.
    const { execFileSync } = require('node:child_process');
    const jalankan = (skrip: string) => {
      try {
        execFileSync('bash', ['-c', `set -o pipefail; teks="$(printf 'jar verified\\n'; seq 200000)"; ${skrip}`]);
        return 'lolos';
      } catch {
        return 'gagal';
      }
    };

    expect(jalankan(`printf '%s\\n' "$teks" | grep -q 'jar verified'`)).toBe('gagal');
    expect(jalankan(`grep -q 'jar verified' <<< "$teks"`)).toBe('lolos');
  });
});
