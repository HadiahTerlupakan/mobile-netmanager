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
    join(__dirname, '../../.github/workflows/ota.yml'),
    'utf8'
  );

  // Gate mutu pindah, tidak hilang: lint/typecheck/tes kini dijalankan "Mobile
  // CI", dan publish hanya berjalan setelah CI itu hijau pada commit yang sama.
  // Mengulangnya di sini berarti menjalankan 1500+ tes dua kali per push.
  it('tidak mengulang lint, typecheck, dan tes yang sudah dijalankan Mobile CI', () => {
    for (const pola of ['expo lint', 'tsc --noEmit', 'jest --ci']) {
      expect({ pola, ada: workflow.includes(pola) }).toEqual({ pola, ada: false });
    }
    expect(workflow).toContain('publish-update.sh');
  });

  it('publish menunggu Mobile CI hijau', () => {
    expect(workflow).toContain('workflows: ["Mobile CI"]');
    expect(workflow).toMatch(/workflow_run\.conclusion\s*==\s*'success'/);
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
    // Pemanggilan sungguhan, bukan penyebutan di komentar atau pesan galat.
    const indeksPenjaga = workflow.indexOf('target="$(node scripts/native-state.js ota-target)"');
    const indeksPublish = workflow.indexOf('./scripts/publish-update.sh production');

    expect(indeksPenjaga).toBeGreaterThan(-1);
    expect(indeksPublish).toBeGreaterThan(indeksPenjaga);
    const penahan = workflow.slice(indeksPenjaga, indeksPublish);
    // Exit 3 berarti "tahan": berhenti tanpa publish, bukan gagal.
    expect(penahan).toMatch(/if \[ "\$status_target" = 3 \]; then\n[^\n]*\n\s*exit 0/);
    // Kode keluar lain selain 0 menggagalkan job.
    expect(penahan).toContain('[ "$status_target" = 0 ] || {');
    expect(penahan).toContain('export RUNTIME_VERSION_OVERRIDE="${target}"');
  });

  it('hanya terpicu dari branch main', () => {
    // Pemicunya kini `workflow_run`, jadi branch dijaga di `if` job — bukan lagi
    // oleh `branches:` pada `on.push`.
    expect(workflow).toMatch(/workflow_run\.head_branch\s*==\s*'main'/);
    expect(workflow).toMatch(/workflow_run\.event\s*==\s*'push'/);
  });

  it('commit dokumentasi/pipeline tetap tidak menerbitkan OTA', () => {
    // `paths-ignore` ikut hilang bersama pemicu `push`, jadi penyaringnya
    // dipasang sebagai langkah eksplisit. Tanpa itu, commit dokumentasi
    // menerbitkan ulang bundel identik ke setiap HP.
    expect(workflow).toContain('Periksa perubahan layak terbit');
    expect(workflow).toMatch(/grep -vE '\^\(docs\/\|\\\.github\/\)'/);
    expect(workflow).toMatch(/grep -vE '\\\.md\$'/);
    expect(workflow).toContain("steps.layak.outputs.terbit == 'true'");
  });

  it('tidak menjalankan dua publish OTA bersamaan', () => {
    expect(workflow).toContain('group: publish-ota');
    expect(workflow).toContain('cancel-in-progress: false');
  });
});

/**
 * CI/CD proyek ini tinggal di GitHub Actions; server Gitea dimatikan. Hanya
 * satu sistem CI yang boleh ada: kalau workflow Gitea muncul kembali, keduanya
 * terpicu pada push ke `main` — satu commit yang didorong ke dua remote akan
 * menerbitkan OTA dua kali ke pengguna yang sama.
 */
describe('rumah CI/CD', () => {
  it('tidak menyisakan workflow Gitea yang ikut menerbitkan OTA', () => {
    expect(existsSync(join(__dirname, '../../.gitea/workflows'))).toBe(false);
  });

  it('menyimpan workflow di .github/workflows', () => {
    for (const nama of ['ci.yml', 'ota.yml', 'build-android.yml']) {
      expect(existsSync(join(__dirname, '../../.github/workflows', nama))).toBe(true);
    }
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
