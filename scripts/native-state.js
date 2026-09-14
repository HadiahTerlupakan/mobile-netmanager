#!/usr/bin/env node
/**
 * Penanda bagian native aplikasi, dan catatan build native terakhir.
 *
 * OTA hanya aman ke APK yang bagian native-nya identik dengan kode yang
 * dibundel — JS yang memanggil modul native yang belum ada di APK membuat
 * aplikasi crash. Fingerprint Expo yang dihitung ulang secara lokal tidak bisa
 * dipakai sebagai penanda (HEAD menghasilkan 1d15ce05 padahal runtime build 46
 * adalah 168f0aae, tanpa perubahan native apa pun), jadi penandanya diambil dari
 * git: hash isi berkas native yang ter-commit, sama di mesin mana pun.
 *
 * Pemakaian:
 *   node scripts/native-state.js hash               hash native commit HEAD
 *   node scripts/native-state.js ota-target         runtime tujuan OTA (lihat decideOtaTarget)
 *   node scripts/native-state.js record <runtime> <versionCode>
 *                                                   tulis native-build.json untuk HEAD
 */

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Semua yang ikut membentuk APK dan tidak bisa dikirim lewat OTA.
const NATIVE_PATHS = [
  "app.json",
  "app.config.ts",
  "eas.json",
  "package.json",
  "package-lock.json",
  "plugins",
  "firebase.json",
  "assets/images",
  "assets/sounds",
  "assets/expo-updates",
];

const STATE_FILE = "native-build.json";

// Keluar dengan kode ini berarti "jangan terbitkan OTA" — bukan kegagalan.
const EXIT_OTA_DITAHAN = 3;

/** Hash isi berkas native di commit HEAD (bukan salinan kerja). */
function computeNativeTreeHash(repoRoot = process.cwd()) {
  const daftar = execFileSync("git", ["ls-tree", "-r", "HEAD", "--", ...NATIVE_PATHS], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return crypto.createHash("sha256").update(daftar).digest("hex");
}

function readBuildState(repoRoot = process.cwd()) {
  const berkas = path.join(repoRoot, STATE_FILE);
  if (!fs.existsSync(berkas)) return null;
  return JSON.parse(fs.readFileSync(berkas, "utf8"));
}

/**
 * Tentukan runtime tujuan OTA dari catatan build native terakhir.
 *
 * - Belum ada build Gitea: `runtimeVersion: null`, pemanggil memakai jalur lama.
 * - Bagian native HEAD sama dengan build terakhir: terbitkan ke runtime build itu.
 * - Berbeda: tahan. APK dengan bagian native baru belum ada, dan mengirim JS
 *   baru ke APK lama bisa membuatnya crash.
 */
function decideOtaTarget(state, headNativeHash) {
  if (!state) return { publish: true, runtimeVersion: null };

  if (typeof state.runtimeVersion !== "string" || state.runtimeVersion.length < 16) {
    throw new Error(`${STATE_FILE}: runtimeVersion tidak sah (${state.runtimeVersion})`);
  }
  if (!state.nativeTreeHash) {
    throw new Error(`${STATE_FILE}: nativeTreeHash kosong`);
  }

  if (state.nativeTreeHash !== headNativeHash) {
    return {
      publish: false,
      reason:
        `Bagian native berubah sejak build versionCode ${state.versionCode}; ` +
        "OTA ditahan sampai build Android baru selesai.",
    };
  }

  return { publish: true, runtimeVersion: state.runtimeVersion };
}

function main() {
  const [perintah, ...arg] = process.argv.slice(2);

  if (perintah === "hash") {
    process.stdout.write(computeNativeTreeHash());
    return;
  }

  if (perintah === "ota-target") {
    const hasil = decideOtaTarget(readBuildState(), computeNativeTreeHash());
    if (!hasil.publish) {
      process.stderr.write(`${hasil.reason}\n`);
      process.exit(EXIT_OTA_DITAHAN);
    }
    if (hasil.runtimeVersion) process.stdout.write(hasil.runtimeVersion);
    return;
  }

  if (perintah === "record") {
    const [runtimeVersion, versionCode] = arg;
    const state = {
      runtimeVersion,
      versionCode: Number(versionCode),
      nativeTreeHash: computeNativeTreeHash(),
      commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      builtAt: new Date().toISOString(),
    };
    decideOtaTarget(state, state.nativeTreeHash);
    fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(state)}\n`);
    return;
  }

  process.stderr.write("Perintah: hash | ota-target | record <runtime> <versionCode>\n");
  process.exit(1);
}

if (require.main === module) main();

module.exports = {
  NATIVE_PATHS,
  STATE_FILE,
  EXIT_OTA_DITAHAN,
  computeNativeTreeHash,
  readBuildState,
  decideOtaTarget,
};
