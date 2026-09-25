import { describe, expect, it } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build native pindah dari EAS cloud ke GitHub Actions karena kuota build akun
 * gratis. Yang ikut pindah bukan cuma perintahnya — tanggung jawab yang
 * dulu dipegang EAS sekarang jadi milik workflow ini: menandatangani artefak
 * dengan kunci yang benar, dan memberi versionCode yang belum pernah dipakai.
 *
 * Dua-duanya gagal dengan cara yang mahal. Build di runner 2 vCPU memakan puluhan
 * menit, dan kedua kesalahan itu baru terlihat saat unggah ke Play Store —
 * setelah waktu itu terbuang. Penjaga di berkas ini menariknya ke depan.
 */

const WORKFLOW_PATH = '.github/workflows/build-android.yml';

function bacaWorkflow(): string {
  return readFileSync(join(__dirname, '../..', WORKFLOW_PATH), 'utf8');
}

/** Isi workflow tanpa baris komentar: penyebutan di komentar bukan jaminan. */
function bacaPerintah(): string {
  return bacaWorkflow()
    .split('\n')
    .filter((baris) => !baris.trim().startsWith('#'))
    .join('\n');
}

describe('workflow build Android', () => {
  it('ada di .github/workflows', () => {
    expect(existsSync(join(__dirname, '../..', WORKFLOW_PATH))).toBe(true);
  });

  it('terpicu otomatis hanya oleh perubahan berkas native', () => {
    // Build native memakan 1-2 jam menit runner. Perubahan JS dikirim lewat
    // OTA; build hanya diperlukan ketika sesuatu yang tidak bisa dikirim OTA
    // berubah.
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
    // Perubahan pipeline langsung diuji oleh build sungguhan.
    expect(blokPush).toContain('.github/workflows/build-android.yml');
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
    const workflow = bacaPerintah();

    expect(workflow).toContain('jarsigner -verify');
    // Pemeriksaan yang sungguh dijalankan, dan menggagalkan langkahnya.
    expect(workflow).toMatch(
      /if grep -qiE 'androiddebugkey\|CN=Android Debug' <<< "\$\{SERTIFIKAT\}"; then\n[^\n]*::error::[^\n]*\n\s*exit 1/
    );
  });

  it('membandingkan sidik jari kunci dengan nilai yang diharapkan', () => {
    // Play Store hanya menerima unggahan bertanda tangan kunci upload yang
    // terdaftar. Nilai yang diharapkan harus benar-benar sampai ke skrip dan
    // ketidakcocokan harus menggagalkan build sebelum Gradle berjalan.
    const workflow = bacaPerintah();
    const indeksBanding = workflow.indexOf('elif [ "${SIDIK}" != "${SIDIK_DIHARAPKAN}" ]; then');

    expect(workflow).toContain('SIDIK_DIHARAPKAN: ${{ vars.RADPRO_UPLOAD_CERT_SHA256 }}');
    expect(workflow).toContain('keytool -list');
    expect(indeksBanding).toBeGreaterThan(-1);
    expect(workflow.slice(indeksBanding, indeksBanding + 300)).toMatch(/exit 1/);
    expect(workflow.indexOf('./gradlew :app:bundleRelease')).toBeGreaterThan(indeksBanding);
  });

  it('menghitung versionCode dari Play Store dan memastikan angkanya terpakai', () => {
    // Nomor run CI tidak tahu bundle apa yang sudah pernah diunggah (build EAS
    // dan Gitea sebelumnya), dan mulai dari nol bila workflow dipindah. Play sendiri yang menegakkan aturan
    // "lebih besar dari bundle tertinggi", jadi angkanya diambil dari sana.
    const workflow = bacaWorkflow();

    expect(workflow).toContain('play-internal.js next-version-code');
    expect(workflow).not.toContain('GITHUB_RUN_NUMBER');
    expect(workflow).toContain('RADPRO_VERSION_CODE');
    expect(workflow).toContain('build.gradle');
  });

  it('menghapus keystore dari runner apa pun hasilnya', () => {
    // Runner GitHub-hosted dibuang setelah job, tetapi jaminan ini tetap
    // dipegang supaya tidak hilang diam-diam bila job pindah ke runner
    // self-hosted yang menetap antar-run.
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

  it('menyetel heap Gradle sendiri setelah prebuild, cukup untuk R8 dan muat di 7 GB', () => {
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

    // Runner GitHub-hosted private hanya 7 GB. Heap + metaspace daemon Gradle
    // harus menyisakan ruang untuk OS, Metro, dan dua proses clang. Anggaran
    // lama (5 GB + 1 GB) hanya muat di container 9 GB runner android-ci.
    const metaspace = workflow.match(/org\.gradle\.jvmargs=[^\n']*-XX:MaxMetaspaceSize=(\d+)([mg])/);
    expect(metaspace).not.toBeNull();
    const metaspaceMb = Number(metaspace![1]) * (metaspace![2] === 'g' ? 1024 : 1);
    expect(megabyte + metaspaceMb).toBeLessThanOrEqual(5 * 1024);
    expect(workflow).toContain('--max-workers=2');
  });

  it('memakai toolchain yang sama dengan image android-ci lama', () => {
    // JDK 17 (AGP 8.x; JDK 21 belum didukung penuh RN 0.81), NDK yang dipatok
    // react-native, dan SDK sesuai expo-build-properties di app.json. Image
    // GitHub bergeser sendiri; versi build tidak boleh ikut bergeser.
    const workflow = bacaWorkflow();

    expect(workflow).toMatch(/uses: actions\/setup-java@v6/);
    expect(workflow).toMatch(/JAVA_VERSION: "17"/);
    expect(workflow).toContain('distribution: temurin');
    expect(workflow).toMatch(/ANDROID_NDK_VERSION: "27\.1\.12297006"/);
    expect(workflow).toMatch(/ANDROID_PLATFORM: "36"/);
    expect(workflow).toMatch(/ANDROID_BUILD_TOOLS: "36\.0\.0"/);
    expect(workflow).toContain('sdkmanager');
    // Komponen dipasang sebelum Gradle memintanya.
    expect(workflow.indexOf('sdkmanager')).toBeLessThan(workflow.indexOf('./gradlew :app:bundleRelease'));
  });

  it('meng-cache Gradle antar-run dengan action versi Node 24', () => {
    const workflow = bacaWorkflow();

    expect(workflow).toMatch(/uses: actions\/cache@v6/);
    expect(workflow).toContain('~/.gradle/caches');
    expect(workflow.indexOf('actions/cache@v6')).toBeLessThan(workflow.indexOf('./gradlew :app:bundleRelease'));
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
    // Tanpa [skip ci], sama seperti di Gitea: OTA susulan ditangani langkah
    // berikutnya, dan push GITHUB_TOKEN memang tidak memicu run baru.
    const tanpaKomentar = workflow
      .split('\n')
      .filter((baris) => !baris.trim().startsWith('#'))
      .join('\n');
    expect(tanpaKomentar).not.toContain('[skip ci]');
  });

  it('memasang token push hanya di langkah pencatatan dan mencabutnya lagi', () => {
    // Checkout tidak menyimpan token; npm ci dan Gradle menjalankan kode pihak
    // ketiga. Token dipasang tepat sebelum push dan dicabut lewat trap.
    const workflow = bacaWorkflow();
    const indeksCatat = workflow.indexOf('- name: Catat build native ke main');
    const indeksPasang = workflow.indexOf('.extraheader "AUTHORIZATION');

    expect(indeksPasang).toBeGreaterThan(indeksCatat);
    expect(workflow).toMatch(/trap 'git config --local --unset-all http\.https:\/\/github\.com\/\.extraheader/);
    expect(workflow.match(/\.extraheader "AUTHORIZATION/g)).toHaveLength(1);
  });

  it('tidak menyebarkan AAB bertanda tangan rilis sebagai artefak Actions', () => {
    // Salinannya sudah ada di Play Console (App bundle explorer). Artefak
    // Actions bisa diunduh siapa pun yang punya akses baca repo.
    expect(bacaWorkflow()).not.toMatch(/actions\/upload-artifact@/);
  });

  it('menyusulkan OTA sendiri bila main bergerak selama build', () => {
    // Push yang memakai GITHUB_TOKEN tidak memicu workflow lain, jadi commit
    // pencatatan tidak akan pernah menjalankan ota.yml. JS yang masuk ke main
    // selama build berjalan tidak ada di AAB; tanpa susulan, ia baru terkirim
    // di push berikutnya. Susulan tetap melewati penahan native yang sama.
    const workflow = bacaPerintah();
    const indeksCatat = workflow.indexOf('native-state.js record');
    const indeksSusulan = workflow.indexOf('target="$(node scripts/native-state.js ota-target)"');
    const indeksPublish = workflow.indexOf('./scripts/publish-update.sh production');

    expect(indeksCatat).toBeGreaterThan(-1);
    expect(indeksSusulan).toBeGreaterThan(indeksCatat);
    expect(indeksPublish).toBeGreaterThan(indeksSusulan);
    // Exit 3 berarti "tahan", dan harus berhenti sebelum publish.
    const penahan = workflow.slice(indeksSusulan, indeksPublish);
    expect(penahan).toMatch(/if \[ "\$status_target" = 3 \]; then\n[^\n]*\n\s*exit 0/);
    expect(workflow).toContain('APP_UPDATE_PUBLISH_TOKEN');
    expect(workflow).toContain('git diff --quiet');
  });
});
