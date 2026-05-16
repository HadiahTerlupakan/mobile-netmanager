const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Tambah maven repo lokal untuk @notifee/react-native ke android/build.gradle.
 * Notifee ship AAR di node_modules/@notifee/react-native/android/libs/ dan tidak
 * publish ke maven central / jitpack, jadi gradle harus tahu lokasi local.
 */
module.exports = function withNotifeeRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const repoBlock = `        maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`;
    if (!contents.includes('@notifee/react-native/android/libs')) {
      // Inject ke allprojects { repositories { ... } }
      contents = contents.replace(
        /allprojects\s*\{\s*repositories\s*\{/,
        (match) => `${match}\n${repoBlock}`,
      );
    }
    config.modResults.contents = contents;
    return config;
  });
};
