#!/usr/bin/env node
/**
 * Resolve runtimeVersion (fingerprint) yang match APK di Play Store.
 *
 * Prioritas:
 *   1. ENV RUNTIME_VERSION_OVERRIDE / EAS_FINGERPRINT
 *   2. eas build:list (butuh EAS CLI + login / EXPO_TOKEN)
 *   3. File eas-production-fingerprint.txt (di-commit setelah EAS build)
 *   4. Fallback @expo/fingerprint lokal (last resort — bisa beda dari EAS)
 *
 * Usage:
 *   node scripts/get-eas-fingerprint.js [platform]
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const Fingerprint = require("@expo/fingerprint");

const platform = process.argv[2] || "android";
const FINGERPRINT_FILE = path.join(
  process.cwd(),
  "eas-production-fingerprint.txt",
);

function tryEnv() {
  const fromEnv =
    process.env.RUNTIME_VERSION_OVERRIDE?.trim() ||
    process.env.EAS_FINGERPRINT?.trim();
  return fromEnv && fromEnv.length >= 16 ? fromEnv : null;
}

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
  } catch {
    return null;
  }
}

function tryFingerprintFile() {
  try {
    if (!fs.existsSync(FINGERPRINT_FILE)) return null;
    const hash = fs.readFileSync(FINGERPRINT_FILE, "utf8").trim();
    return hash.length >= 16 ? hash : null;
  } catch {
    return null;
  }
}

async function fallbackLocalFingerprint() {
  process.stderr.write(
    "⚠️  Fallback compute lokal — hasil bisa beda dari APK Play Store.\n",
  );
  return Fingerprint.createProjectHashAsync(".", {
    platforms: [platform],
  });
}

(async () => {
  try {
    const fromEnv = tryEnv();
    if (fromEnv) {
      process.stderr.write("   source: ENV override\n");
      process.stdout.write(fromEnv);
      return;
    }

    const fromEas = tryEasBuildList();
    if (fromEas) {
      process.stderr.write("   source: EAS build:list\n");
      process.stdout.write(fromEas);
      return;
    }

    const fromFile = tryFingerprintFile();
    if (fromFile) {
      process.stderr.write(
        `   source: ${path.basename(FINGERPRINT_FILE)}\n`,
      );
      process.stdout.write(fromFile);
      return;
    }

    const local = await fallbackLocalFingerprint();
    if (!local || local.length < 16) {
      process.stderr.write(`❌ Fingerprint invalid: '${local}'\n`);
      process.exit(1);
    }
    process.stdout.write(local);
  } catch (err) {
    process.stderr.write(
      `❌ Gagal ambil fingerprint: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
})();
