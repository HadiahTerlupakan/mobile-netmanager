const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Inject release signing config ke android/app/build.gradle setelah prebuild.
 *
 * Tanpa plugin ini, prebuild --clean akan reset build.gradle ke template
 * default Expo, yang pakai debug keystore untuk release build → APK/AAB
 * akan di-reject Play Store.
 *
 * Credentials dibaca dari env var saat gradle build (bukan saat prebuild),
 * jadi password tidak ter-bake ke build.gradle. .env.local di-load oleh
 * build_aab.sh sebelum gradle dipanggil.
 */

const RELEASE_SIGNING_BLOCK = `        release {
            def releaseStoreFile = System.getenv("RADPRO_RELEASE_STORE_FILE") ?: project.findProperty("RADPRO_RELEASE_STORE_FILE")
            def releaseStorePassword = System.getenv("RADPRO_RELEASE_STORE_PASSWORD") ?: project.findProperty("RADPRO_RELEASE_STORE_PASSWORD")
            def releaseKeyAlias = System.getenv("RADPRO_RELEASE_KEY_ALIAS") ?: project.findProperty("RADPRO_RELEASE_KEY_ALIAS")
            def releaseKeyPassword = System.getenv("RADPRO_RELEASE_KEY_PASSWORD") ?: project.findProperty("RADPRO_RELEASE_KEY_PASSWORD")

            if (releaseStoreFile && releaseStorePassword && releaseKeyAlias && releaseKeyPassword) {
                storeFile file(releaseStoreFile)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }`;

const RELEASE_BUILD_TYPE_REPLACEMENT = `        release {
            def hasReleaseConfig = signingConfigs.release.storeFile != null
            signingConfig hasReleaseConfig ? signingConfigs.release : signingConfigs.debug`;

module.exports = function withReleaseSigningConfig(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'build.gradle',
      );

      if (!fs.existsSync(buildGradlePath)) {
        throw new Error(`build.gradle tidak ditemukan: ${buildGradlePath}`);
      }

      let contents = fs.readFileSync(buildGradlePath, 'utf8');

      // 1. Inject release signing config di dalam signingConfigs block.
      // Default template hanya punya `debug { ... }` di dalam signingConfigs.
      const debugSigningRegex =
        /signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*\}/m;

      if (!debugSigningRegex.test(contents)) {
        throw new Error(
          'signingConfigs.debug block tidak ditemukan di build.gradle — template berubah?',
        );
      }

      contents = contents.replace(debugSigningRegex, (match) => {
        // Sisipkan release block sebelum closing brace signingConfigs.
        return match.replace(/\}\s*\}$/, `}\n${RELEASE_SIGNING_BLOCK}\n    }`);
      });

      // 2. Replace `signingConfig signingConfigs.debug` di release build type
      // dengan conditional yang pakai release config kalau credentials ada.
      const releaseBuildTypeRegex =
        /release\s*\{\s*\/\/ Caution[\s\S]*?signingConfig signingConfigs\.debug/;

      if (!releaseBuildTypeRegex.test(contents)) {
        throw new Error(
          'release build type block tidak match pattern default — template berubah?',
        );
      }

      contents = contents.replace(
        releaseBuildTypeRegex,
        RELEASE_BUILD_TYPE_REPLACEMENT,
      );

      fs.writeFileSync(buildGradlePath, contents);
      return config;
    },
  ]);
};
