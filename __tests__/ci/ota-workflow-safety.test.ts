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
    const urutan = ['expo lint', 'tsc --noEmit', 'jest --ci', 'publish-update.sh'];
    const posisi = urutan.map((pola) => workflow.indexOf(pola));

    expect(posisi.every((i) => i >= 0)).toBe(true);
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
  });

  it('memakai skrip publish milik repo, bukan eas update', () => {
    // OTA proyek ini self-hosted: app.config.ts mengarahkan updates.url ke
    // /api/mobile/app-update/manifest milik netmanager, bukan u.expo.dev.
    // `eas update` menolak konfigurasi seperti ini.
    expect(workflow).toContain('scripts/publish-update.sh');
    expect(workflow).not.toContain('eas update');
  });

  it('menerbitkan ke channel production', () => {
    expect(workflow).toContain('publish-update.sh production');
  });

  it('berhenti lebih dulu ketika token publish belum diset', () => {
    expect(workflow).toContain('APP_UPDATE_PUBLISH_TOKEN');
    expect(workflow).toContain('::error::');
  });

  it('menyediakan EXPO_TOKEN untuk resolusi fingerprint', () => {
    // publish-update.sh mengambil fingerprint dari EAS build, bukan menghitung
    // lokal, sehingga tetap butuh kredensial EAS.
    expect(workflow).toContain('EXPO_TOKEN');
  });

  it('tidak menyisipkan pesan commit langsung ke baris perintah', () => {
    expect(workflow).toContain('subject="$(git log -1 --pretty=%s)"');
  });

  it('menahan OTA ketika bagian native berubah sejak build terakhir', () => {
    // JS yang memanggil modul native yang belum ada di APK membuat aplikasi
    // crash. native-state.js membandingkan hash berkas native HEAD dengan
    // catatan build terakhir sebelum publish.
    const indeksPenjaga = workflow.indexOf('native-state.js ota-target');
    const indeksPublish = workflow.indexOf('./scripts/publish-update.sh');

    expect(indeksPenjaga).toBeGreaterThan(-1);
    expect(indeksPublish).toBeGreaterThan(indeksPenjaga);
    expect(workflow).toContain('RUNTIME_VERSION_OVERRIDE');
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

/**
 * Publish OTA memanggil `npx eas`. Tanpa `eas-cli` terpasang di proyek, npx
 * tidak bisa memetakan nama binary `eas` ke paketnya dan job berhenti dengan
 * "could not determine executable to run" — kegagalan yang tidak menyebut EAS
 * sama sekali, sehingga sulit dikenali.
 *
 * Versinya dipatok persis supaya CI memakai yang sama dengan yang diverifikasi
 * di mesin pengembang.
 */
describe('ketergantungan eas-cli', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '../../package.json'), 'utf8')
  );

  it('terpasang sebagai devDependency', () => {
    expect(pkg.devDependencies?.['eas-cli']).toBeDefined();
  });

  it('dipatok pada versi persis, bukan rentang', () => {
    expect(pkg.devDependencies['eas-cli']).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
