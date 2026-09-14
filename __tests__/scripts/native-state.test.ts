import { describe, expect, it } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const {
  NATIVE_PATHS,
  computeNativeTreeHash,
  decideOtaTarget,
} = require('../../scripts/native-state.js');

/**
 * OTA hanya aman ke APK yang bagian native-nya identik dengan kode yang
 * dibundel. JS yang memanggil modul native yang belum ada di APK membuat
 * aplikasi crash di tangan teknisi.
 *
 * Fingerprint Expo yang dihitung ulang secara lokal tidak bisa dipakai sebagai
 * penanda: HEAD menghasilkan 1d15ce05 padahal runtime build 46 adalah 168f0aae,
 * tanpa satu pun perubahan native. Penandanya diambil dari git — hash isi
 * berkas native yang ter-commit — yang sama di mesin mana pun.
 */

function repoSementara(): string {
  const dir = mkdtempSync(join(tmpdir(), 'native-state-'));
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 'uji@contoh.id');
  git('config', 'user.name', 'uji');
  writeFileSync(join(dir, 'app.json'), '{"expo":{}}');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'layar.tsx'), 'export {}');
  git('add', '.');
  git('commit', '-q', '-m', 'awal');
  return dir;
}

function commit(dir: string, berkas: string, isi: string) {
  writeFileSync(join(dir, berkas), isi);
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', berkas], { cwd: dir });
}

describe('hash berkas native', () => {
  it('mencakup berkas yang ikut dibangun ke APK', () => {
    for (const jalur of [
      'app.json',
      'app.config.ts',
      'package.json',
      'package-lock.json',
      'plugins',
      'firebase.json',
      'assets/images',
      'assets/sounds',
      'assets/expo-updates',
    ]) {
      expect(NATIVE_PATHS).toContain(jalur);
    }
  });

  it('tidak berubah ketika hanya kode JS yang berubah', () => {
    const dir = repoSementara();
    const sebelum = computeNativeTreeHash(dir);
    commit(dir, 'src/layar.tsx', 'export const x = 1');

    expect(computeNativeTreeHash(dir)).toBe(sebelum);
  });

  it('berubah ketika berkas native berubah', () => {
    const dir = repoSementara();
    const sebelum = computeNativeTreeHash(dir);
    commit(dir, 'app.json', '{"expo":{"name":"lain"}}');

    expect(computeNativeTreeHash(dir)).not.toBe(sebelum);
  });

  it('memakai isi yang ter-commit, bukan salinan kerja', () => {
    // Berkas yang diubah tapi belum di-commit tidak ikut dibangun CI.
    const dir = repoSementara();
    const sebelum = computeNativeTreeHash(dir);
    writeFileSync(join(dir, 'app.json'), '{"belum":"commit"}');

    expect(computeNativeTreeHash(dir)).toBe(sebelum);
  });
});

describe('keputusan target OTA', () => {
  const build = {
    runtimeVersion: 'a'.repeat(40),
    nativeTreeHash: 'hash-native-build',
    versionCode: 47,
  };

  it('menerbitkan ke runtime build terakhir bila bagian native HEAD sama', () => {
    expect(decideOtaTarget(build, 'hash-native-build')).toEqual({
      publish: true,
      runtimeVersion: build.runtimeVersion,
    });
  });

  it('menahan OTA bila bagian native berubah sejak build terakhir', () => {
    const hasil = decideOtaTarget(build, 'hash-native-lain');

    expect(hasil.publish).toBe(false);
    expect(hasil.reason).toMatch(/native/);
  });

  it('menyerahkan ke jalur lama bila belum ada build Gitea', () => {
    // Sebelum build pertama di Gitea terbit, runtime masih diambil dari EAS.
    expect(decideOtaTarget(null, 'apa-saja')).toEqual({ publish: true, runtimeVersion: null });
  });

  it('menolak catatan build yang tidak lengkap', () => {
    expect(() =>
      decideOtaTarget({ runtimeVersion: 'pendek', nativeTreeHash: 'x', versionCode: 47 }, 'x')
    ).toThrow(/runtimeVersion/);
  });
});
