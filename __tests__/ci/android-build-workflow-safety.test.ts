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

  it('terpicu otomatis hanya oleh perubahan berkas native', () => {
    // Build native memakan 1-2 jam di runner yang juga melayani deploy
    // produksi (capacity 1). Perubahan JS dikirim lewat OTA; build hanya
    // diperlukan ketika sesuatu yang tidak bisa dikirim OTA berubah.
    const workflow = bacaWorkflow();
    const { NATIVE_PATHS } = require('../../scripts/native-state.js');
    const blokPush = workflow.slice(workflow.indexOf('  push:'), workflow.indexOf('  workflow_dispatch:'));

    expect(workflow).toContain('workflow_dispatch:');
    expect(blokPush).toContain('branches: [main]');
    expect(blokPush).toContain('paths:');
    for (const jalur of NATIVE_PATHS) {
      expect(blokPush).toContain(jalur);
    }
    // Catatan build yang di-commit balik tidak boleh memicu build lagi.
    expect(blokPush).not.toContain('native-build.json');
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

  it('menghitung versionCode dari Play Store dan memastikan angkanya terpakai', () => {
    // Nomor run Gitea dihitung per repo, bukan per workflow, sehingga basis +
    // nomor run melompat-lompat. Play sendiri yang menegakkan aturan
    // "lebih besar dari bundle tertinggi", jadi angkanya diambil dari sana.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('play-internal.js next-version-code');
    expect(workflow).not.toContain('GITHUB_RUN_NUMBER');
    expect(workflow).toContain('RADPRO_VERSION_CODE');
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
    // Runtime dari artefak itu yang dicatat untuk OTA.
    expect(workflow).toMatch(/native-state\.js record "\$\{RADPRO_FINGERPRINT\}"/);
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

  it('menyetel heap Gradle sendiri setelah prebuild, cukup untuk R8', () => {
    // Run #16 gagal di menit ke-107: `minifyReleaseWithR8` OutOfMemoryError
    // dengan heap 2 GiB. app.json meminta 4 GB lewat
    // expo-build-properties.gradleProperties, tetapi plugin itu tidak mengenal
    // opsi tersebut dan mengabaikannya diam-diam; gradle.properties hasil
    // prebuild tetap memakai bawaan template. EAS tidak pernah terkena karena
    // mesin build-nya menyetel memori Gradle sendiri.
    const workflow = bacaWorkflow();
    const indeksPrebuild = workflow.indexOf('npx expo prebuild');
    const indeksHeap = workflow.indexOf('org.gradle.jvmargs');
    const indeksGradle = workflow.indexOf('./gradlew :app:bundleRelease');

    expect(indeksHeap).toBeGreaterThan(indeksPrebuild);
    expect(indeksGradle).toBeGreaterThan(indeksHeap);

    const heap = workflow.match(/org\.gradle\.jvmargs=-Xmx(\d+)([mg])/);
    expect(heap).not.toBeNull();
    const megabyte = Number(heap![1]) * (heap![2] === 'g' ? 1024 : 1);
    expect(megabyte).toBeGreaterThanOrEqual(4096);
  });

  it('mengunggah ke track internal setelah semua pemeriksaan artefak lolos', () => {
    const workflow = bacaWorkflow();
    const indeksUnggah = workflow.indexOf('play-internal.js upload');

    expect(indeksUnggah).toBeGreaterThan(workflow.indexOf('jarsigner -verify'));
    expect(indeksUnggah).toBeGreaterThan(workflow.indexOf('base/assets/index.android.bundle'));
    expect(workflow).toContain('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
    expect(workflow).not.toMatch(/tracks\/production|track production/);
  });

  it('mencatat build native ke main setelah unggahan berhasil', () => {
    // OTA membaca catatan ini untuk tahu runtime tujuan dan kapan harus
    // menahan diri. Catatan yang ditulis sebelum unggahan berhasil akan
    // mengarahkan OTA ke APK yang tidak pernah terbit.
    const workflow = bacaWorkflow();
    const indeksCatat = workflow.indexOf('native-state.js record');

    expect(indeksCatat).toBeGreaterThan(workflow.indexOf('play-internal.js upload'));
    expect(workflow).toContain('native-build.json');
    expect(workflow).toMatch(/git push[^\n]*main/);
  });

  it('tidak memakai upload-artifact v4 yang ditolak Gitea', () => {
    // Run #20 merah di langkah terakhir: @actions/artifact v2+ mendeteksi
    // server non-GitHub dan menolak jalan (GHESNotSupportedError), padahal AAB
    // sudah terunggah ke Play dan tercatat. AAB tetap bisa diunduh dari App
    // bundle explorer di Play Console.
    expect(bacaWorkflow()).not.toMatch(/actions\/upload-artifact@v4/);
  });

  it('menyusulkan OTA sendiri bila main bergerak selama build', () => {
    // Push yang memakai token Actions tidak memicu workflow lain, jadi commit
    // pencatatan tidak akan pernah menjalankan ota.yml. JS yang masuk ke main
    // selama build berjalan tidak ada di AAB; tanpa susulan, ia baru terkirim
    // di push berikutnya. Susulan tetap melewati penahan native yang sama.
    const workflow = bacaWorkflow();
    const indeksCatat = workflow.indexOf('native-state.js record');
    const indeksSusulan = workflow.indexOf('native-state.js ota-target');
    const indeksPublish = workflow.indexOf('publish-update.sh production');

    expect(indeksSusulan).toBeGreaterThan(indeksCatat);
    expect(indeksPublish).toBeGreaterThan(indeksSusulan);
    expect(workflow).toContain('APP_UPDATE_PUBLISH_TOKEN');
    expect(workflow).toContain('git diff --quiet');
  });
});
