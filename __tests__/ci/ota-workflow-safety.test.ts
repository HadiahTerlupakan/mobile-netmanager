import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * OTA mengirim bundle JavaScript langsung ke pengguna tanpa melewati review
 * toko. Tidak ada jaring pengaman di belakangnya, jadi gerbang mutunya harus
 * ada di pipeline — dan pemeriksaan keterjangkauannya tidak boleh hilang:
 * update yang runtimeVersion-nya bergeser tetap "berhasil" terbit lalu diam-diam
 * tidak diterima perangkat mana pun.
 */
describe('workflow publish OTA', () => {
  const workflow = readFileSync(
    join(__dirname, '../../.gitea/workflows/ota.yml'),
    'utf8'
  );

  it('menjalankan lint, typecheck, dan tes sebelum publish', () => {
    const urutan = ['expo lint', 'tsc --noEmit', 'jest --ci', 'eas update'];
    const posisi = urutan.map((pola) => workflow.indexOf(pola));

    expect(posisi.every((i) => i >= 0)).toBe(true);
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
  });

  it('memeriksa keterjangkauan update terhadap build terakhir', () => {
    expect(workflow).toContain('Pastikan update terjangkau perangkat');
    expect(workflow).toContain('eas build:list');
    expect(workflow).toContain('runtimeVersion');
  });

  it('menggagalkan job ketika update tidak terjangkau', () => {
    // Peringatan saja tidak cukup: publish yang tidak sampai terlihat sukses.
    const bagian = workflow.slice(
      workflow.indexOf('Pastikan update terjangkau perangkat')
    );

    expect(bagian).toContain('::error::');
    expect(bagian).toContain('exit 1');
  });

  it('hanya menerima ketidakcocokan runtime atas permintaan eksplisit', () => {
    expect(workflow).toContain('allow_runtime_mismatch');
    expect(workflow).toContain('ALLOW_MISMATCH');
  });

  it('tidak menyisipkan pesan commit langsung ke baris perintah', () => {
    // Isi pesan commit datang dari luar; ia ditampung variabel lebih dulu.
    expect(workflow).toContain('subject="$(git log -1 --pretty=%s)"');
    expect(workflow).not.toContain('--message "${GITHUB_SHA:0:8} - $(git log');
  });

  it('hanya terpicu dari branch main', () => {
    expect(workflow).toContain('branches: [main]');
  });
});

/**
 * CI/CD proyek ini tinggal di Gitea. Workflow GitHub dihapus karena keduanya
 * terpicu pada push ke `main` — satu commit yang didorong ke dua remote akan
 * menerbitkan OTA dua kali ke pengguna yang sama.
 */
describe('rumah CI/CD', () => {
  it('tidak menyisakan workflow GitHub yang ikut menerbitkan OTA', () => {
    expect(existsSync(join(__dirname, '../../.github/workflows'))).toBe(false);
  });

  it('menyimpan workflow di .gitea/workflows', () => {
    expect(
      existsSync(join(__dirname, '../../.gitea/workflows/ota.yml'))
    ).toBe(true);
    expect(existsSync(join(__dirname, '../../.gitea/workflows/ci.yml'))).toBe(
      true
    );
  });
});
