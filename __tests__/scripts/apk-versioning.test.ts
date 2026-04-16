const { prepareNextVersion } = require('../../scripts/apk-versioning');

describe('prepareNextVersion', () => {
  it('bumps from the app.json baseline and synchronizes a stale build.gradle version', () => {
    const appJsonContent = JSON.stringify(
      {
        expo: {
          version: '1.0.34',
          extra: {
            versionCode: 35,
          },
        },
      },
      null,
      2
    );

    const buildGradleContent = `android {
  defaultConfig {
    versionCode 4
    versionName "1.0.37"
  }
}`;

    const result = prepareNextVersion({
      appJsonContent,
      buildGradleContent,
    });

    expect(result).toEqual(
      expect.objectContaining({
        currentVersionName: '1.0.34',
        currentVersionCode: 35,
        nextVersionName: '1.0.35',
        nextVersionCode: 36,
      })
    );

    expect(JSON.parse(result.nextAppJsonContent)).toEqual(
      expect.objectContaining({
        expo: expect.objectContaining({
          version: '1.0.35',
          extra: expect.objectContaining({
            versionCode: 36,
          }),
        }),
      })
    );

    expect(result.nextBuildGradleContent).toContain('versionCode 36');
    expect(result.nextBuildGradleContent).toContain('versionName "1.0.35"');
    expect(result.nextBuildGradleContent).not.toContain('versionCode 4');
    expect(result.nextBuildGradleContent).not.toContain('versionName "1.0.37"');
  });
});
