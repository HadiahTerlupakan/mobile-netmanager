import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Run OTA #12 menerbitkan update ke runtime yang tidak dimiliki perangkat mana
 * pun. Log-nya menunjukkan sebabnya:
 *
 *   source: eas-production-fingerprint.txt
 *
 * Skrip memanggil `execFileSync("eas")`. Di runner CI `eas` tidak ada di PATH
 * (hanya di node_modules/.bin), panggilan itu gagal, dan `catch` menelannya
 * tanpa pesan — lalu skrip diam-diam jatuh ke berkas ter-commit yang isinya
 * sudah basi berbulan-bulan.
 */
describe('get-eas-fingerprint', () => {
  const skrip = readFileSync(
    join(__dirname, '../../scripts/get-eas-fingerprint.js'),
    'utf8'
  );

  it('memakai binary eas milik proyek, bukan yang diharapkan ada di PATH', () => {
    expect(skrip).not.toMatch(/execFileSync\(\s*["']eas["']/);
    expect(skrip).toContain('node_modules');
  });

  it('melaporkan alasan ketika pencarian ke EAS gagal', () => {
    // catch kosong adalah yang membuat kegagalan ini tak terlihat.
    expect(skrip).not.toMatch(/catch\s*\{\s*return null;?\s*\}/);
  });
});

describe('eas-production-fingerprint.txt', () => {
  it('menunjuk runtime APK yang sedang terbit di Play Store (build 46)', () => {
    // Dicek dari AAB build 46: base/assets/fingerprint.
    const isi = readFileSync(
      join(__dirname, '../../eas-production-fingerprint.txt'),
      'utf8'
    ).trim();

    expect(isi).toBe('168f0aaea9721e74d432c82875eb75270ce936a4');
  });
});
