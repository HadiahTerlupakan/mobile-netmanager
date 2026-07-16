#!/usr/bin/env node
/**
 * Compute fingerprint project hash via @expo/fingerprint.
 *
 * Dipakai publish-update.sh untuk dapatkan runtimeVersion yang match
 * dengan APK di Play Store (runtimeVersion.policy = fingerprint).
 *
 * Output: hash string (mis. 484358f20668...) ke stdout.
 */

const Fingerprint = require("@expo/fingerprint");

const projectRoot = process.argv[2] || ".";
const platform = process.argv[3];

(async () => {
  try {
    const options = platform ? { platforms: [platform] } : undefined;
    const hash = await Fingerprint.createProjectHashAsync(
      projectRoot,
      options,
    );
    process.stdout.write(hash);
  } catch (err) {
    process.stderr.write(
      `❌ Gagal compute fingerprint: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
})();