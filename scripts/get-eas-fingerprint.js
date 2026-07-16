#!/usr/bin/env node
/**
 * Ambil runtimeVersion (fingerprint) dari EAS build terbaru yang FINISHED.
 *
 * Kenapa bukan compute lokal via @expo/fingerprint?
 *   Hash lokal bisa beda dari hash yang dipakai EAS saat build APK
 *   (environment, file secret, google-services.json, dll). APK di Play
 *   Store kirim hash EAS ke manifest endpoint — jadi OTA harus pakai
 *   hash yang sama, bukan hash lokal.
 *
 * Fallback: kalau EAS CLI tidak ada / tidak login / tidak ada build
 *   FINISHED, compute lokal via @expo/fingerprint (last resort).
 *
 * Usage:
 *   node scripts/get-eas-fingerprint.js [platform]   # default android
 *
 * Output: hash fingerprint ke stdout.
 */

const { execFileSync } = require("child_process");
const Fingerprint = require("@expo/fingerprint");

const platform = process.argv[2] || "android";

function tryEasBuildList() {
  try {
    const raw = execFileSync(
      "eas",
      [
        "build:list",
        "--platform",
        platform,
        "--limit",
        "20",
        "--json",
        "--non-interactive",
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    const builds = JSON.parse(raw);
    const finished = builds.find(
      (b) => b.status === "FINISHED" && b.fingerprint?.hash,
    );
    return finished?.fingerprint?.hash ?? null;
  } catch (err) {
    process.stderr.write(
      `⚠️  eas build:list gagal: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return null;
  }
}

async function fallbackLocalFingerprint() {
  process.stderr.write(
    "⚠️  Tidak ada build FINISHED di EAS — fallback compute lokal.\n",
  );
  const options = { platforms: [platform] };
  return Fingerprint.createProjectHashAsync(".", options);
}

(async () => {
  try {
    const hash = tryEasBuildList() ?? (await fallbackLocalFingerprint());
    if (!hash || hash.length < 16) {
      process.stderr.write(`❌ Fingerprint invalid: '${hash}'\n`);
      process.exit(1);
    }
    process.stdout.write(hash);
  } catch (err) {
    process.stderr.write(
      `❌ Gagal ambil fingerprint: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
})();