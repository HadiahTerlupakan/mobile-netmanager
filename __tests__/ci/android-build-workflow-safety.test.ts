import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build native pindah dari EAS cloud ke runner Gitea sendiri karena kuota build
 * akun gratis. Yang ikut pindah bukan cuma perintahnya — tanggung jawab yang
 * dulu dipegang EAS sekarang jadi milik workflow ini: menandatangani artefak
 * dengan kunci yang benar, dan memberi versionCode yang belum pernah dipakai.
 *
 * Dua-duanya gagal dengan cara yang mahal. Build di mesin ini memakan puluhan
 * menit, dan kedua kesalahan itu baru terlihat saat unggah ke Play Store —
 * setelah waktu itu terbuang. Penjaga di berkas ini menariknya ke depan.
 */

const WORKFLOW_PATH = '.gitea/workflows/build-android.yml';

function bacaWorkflow(): string {
  return readFileSync(join(__dirname, '../..', WORKFLOW_PATH), 'utf8');
}

describe('workflow build Android', () => {
  it('ada di .gitea/workflows', () => {
    expect(existsSync(join(__dirname, '../..', WORKFLOW_PATH))).toBe(true);
  });

  it('hanya jalan kalau diminta, bukan tiap push', () => {
    // Build native memakan puluhan menit di runner ini dan runner-nya melayani
    // deploy produksi netmanager juga (capacity 1). Memicunya tiap push akan
    // mengantre deploy di belakang build aplikasi.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^on:\s*\n\s+push:/m);
  });

  it('memeriksa kredensial keystore sebelum membangun apa pun', () => {
    // Tanpa pemeriksaan ini, kredensial yang hilang baru ketahuan di akhir —
    // dan Gradle tidak berhenti, ia jatuh ke debug keystore.
    const workflow = bacaWorkflow();
    const indeksPeriksa = workflow.indexOf('RADPRO_RELEASE_STORE_PASSWORD');
    const indeksGradle = workflow.indexOf('bundleRelease');

    expect(indeksPeriksa).toBeGreaterThan(-1);
    expect(indeksGradle).toBeGreaterThan(indeksPeriksa);
  });

  it('menolak artefak yang tertandatangani debug keystore', () => {
    // `withReleaseSigningConfig` memakai
    // `signingConfig hasReleaseConfig ? release : debug`, jadi build tanpa
    // kredensial tetap menghasilkan AAB — hanya saja ditandatangani kunci
    // debug. Artefak itu terlihat normal sampai Play Store menolaknya.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('jarsigner -verify');
    expect(workflow).toMatch(/androiddebugkey|CN=Android Debug/);
  });

  it('membandingkan sidik jari kunci dengan nilai yang diharapkan', () => {
    const workflow = bacaWorkflow();

    expect(workflow).toContain('RADPRO_UPLOAD_CERT_SHA256');
    expect(workflow).toContain('keytool -list');
  });

  it('memberi versionCode eksplisit dan memastikan angkanya benar-benar terpakai', () => {
    // `expo prebuild` menulis versionCode 1 kalau tidak ada yang menyediakan
    // angkanya. Memeriksa build.gradle hasil prebuild membuktikan angka yang
    // dihitung benar-benar sampai ke artefak.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('RADPRO_VERSION_CODE');
    expect(workflow).toContain('versionCode');
    expect(workflow).toContain('build.gradle');
  });

  it('menghapus keystore dari runner apa pun hasilnya', () => {
    // Runner ini menetap antar-run. Keystore yang tertinggal akan terbawa ke
    // job berikutnya, termasuk job repo lain.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('if: always()');
    expect(workflow).toMatch(/rm -f .*keystore|shred/);
  });

  it('menjalankan lint, typecheck, dan tes sebelum build panjangnya dimulai', () => {
    const workflow = bacaWorkflow();
    const urutan = ['expo lint', 'tsc --noEmit', 'jest --ci', 'bundleRelease'];
    const posisi = urutan.map((pola) => workflow.indexOf(pola));

    expect(posisi.every((i) => i >= 0)).toBe(true);
    expect(posisi).toEqual([...posisi].sort((a, b) => a - b));
  });

  it('mencatat runtimeVersion yang benar-benar tertanam di AAB', () => {
    // OTA hanya sampai ke perangkat yang runtimeVersion-nya sama persis.
    // Fingerprint yang dihitung ulang secara lokal bisa berbeda dari yang
    // ditanam expo-updates saat build; yang dipakai perangkat adalah berkas
    // base/assets/fingerprint di dalam artefak.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('base/assets/fingerprint');
    expect(workflow).toContain('eas-production-fingerprint.txt');
    expect(workflow).not.toContain('compute-fingerprint.js');
  });

  it('memasang google-services.json dari secret sebelum prebuild', () => {
    // Berkas ini di-.gitignore; dulu EAS menyuntikkannya lewat variabel berkas
    // GOOGLE_SERVICES_JSON. Tanpa itu `expo prebuild` gagal menyalinnya.
    const workflow = bacaWorkflow();
    const indeksPasang = workflow.indexOf('GOOGLE_SERVICES_JSON_BASE64');
    // Perintahnya, bukan penyebutan di komentar kepala berkas.
    const indeksPrebuild = workflow.indexOf('npx expo prebuild');

    expect(indeksPasang).toBeGreaterThan(-1);
    expect(indeksPrebuild).toBeGreaterThan(indeksPasang);
  });

  it('menolak AAB yang bundle JS-nya membawa konfigurasi Firebase non-web', () => {
    // Build tetap lolos dengan konfigurasi Android, lalu chat dan realtime work
    // order mati di perangkat karena Google menolak key Android untuk JS SDK.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('base/assets/index.android.bundle');
    expect(workflow).toMatch(/:web:/);
  });
});
