const VERSION_NAME_PATTERN = /versionName\s+"([^"]+)"/;
const VERSION_CODE_PATTERN = /versionCode\s+(\d+)/;

function parsePatchVersion(versionName) {
  const [major = "1", minor = "0", patch = "0"] = versionName.split(".");
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
}

function bumpVersionName(versionName) {
  const { major, minor, patch } = parsePatchVersion(versionName);
  const nextPatch = patch + 1;

  if (nextPatch < 100) {
    return `${major}.${minor}.${nextPatch}`;
  }

  return `${major}.${minor + 1}.0`;
}

function readCurrentVersion(appJsonContent) {
  const appJson = JSON.parse(appJsonContent);
  const currentVersionName = appJson?.expo?.version;
  const currentVersionCode = appJson?.expo?.extra?.versionCode;

  if (!currentVersionName || !Number.isFinite(currentVersionCode)) {
    throw new Error("app.json harus memiliki expo.version dan expo.extra.versionCode");
  }

  return { appJson, currentVersionName, currentVersionCode };
}

function replaceBuildGradleVersion(buildGradleContent, nextVersionName, nextVersionCode) {
  return buildGradleContent
    .replace(VERSION_CODE_PATTERN, `versionCode ${nextVersionCode}`)
    .replace(VERSION_NAME_PATTERN, `versionName "${nextVersionName}"`);
}

/**
 * Menyiapkan versi APK berikutnya dari baseline app.json dan menyinkronkan build.gradle.
 */
function prepareNextVersion({ appJsonContent, buildGradleContent }) {
  const { appJson, currentVersionName, currentVersionCode } =
    readCurrentVersion(appJsonContent);
  const nextVersionName = bumpVersionName(currentVersionName);
  const nextVersionCode = currentVersionCode + 1;

  appJson.expo.version = nextVersionName;
  appJson.expo.extra = {
    ...(appJson.expo.extra || {}),
    versionCode: nextVersionCode,
  };

  return {
    currentVersionName,
    currentVersionCode,
    nextVersionName,
    nextVersionCode,
    nextAppJsonContent: `${JSON.stringify(appJson, null, 2)}\n`,
    nextBuildGradleContent: replaceBuildGradleVersion(
      buildGradleContent,
      nextVersionName,
      nextVersionCode,
    ),
  };
}

module.exports = {
  prepareNextVersion,
};
