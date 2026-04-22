import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';

describe('firebase-only mobile notification cleanup', () => {
  it('removes the legacy expo notification files, config, and dependency wiring', () => {
    const packageJsonSource = readFileSync(join(__dirname, '../../package.json'), 'utf8');
    const appJsonSource = readFileSync(join(__dirname, '../../app.json'), 'utf8');
    const jestConfigSource = readFileSync(join(__dirname, '../../jest.config.js'), 'utf8');

    expect(packageJsonSource).not.toContain('expo-notifications');
    expect(appJsonSource).not.toContain('expo-notifications');
    expect(jestConfigSource).not.toContain('expo-notifications');
    expect(existsSync(join(__dirname, '../../src/hooks/usePushNotifications.ts'))).toBe(false);
    expect(existsSync(join(__dirname, '../../src/services/NotificationService.ts'))).toBe(false);
  });

  it('declares Android notification permission for Firebase delivery', () => {
    const appJson = JSON.parse(readFileSync(join(__dirname, '../../app.json'), 'utf8'));

    expect(appJson.expo.android.permissions).toContain('android.permission.POST_NOTIFICATIONS');
  });

  it('pins Firebase Android notifications to the managed high-priority channel', () => {
    const firebaseJsonSource = readFileSync(join(__dirname, '../../firebase.json'), 'utf8');
    const firebaseConfig = JSON.parse(firebaseJsonSource);

    expect(firebaseConfig['react-native']).toEqual(expect.objectContaining({
      messaging_android_notification_channel_id: 'high-priority',
    }));
  });

  it('keeps the managed Expo notification wiring valid before or after native prebuild output exists', () => {
    const appJson = JSON.parse(readFileSync(join(__dirname, '../../app.json'), 'utf8'));
    const androidBuildGradlePath = join(__dirname, '../../android/build.gradle');

    expect(appJson.expo.plugins).toEqual(
      expect.arrayContaining([
        [
          'expo-build-properties',
          expect.objectContaining({
            android: expect.objectContaining({
              minSdkVersion: 26,
            }),
          }),
        ],
        '@react-native-firebase/app/app.plugin.js',
        '@react-native-firebase/messaging/app.plugin.js',
      ]),
    );

    if (existsSync(androidBuildGradlePath)) {
      const androidBuildGradleSource = readFileSync(androidBuildGradlePath, 'utf8');

      expect(androidBuildGradleSource).toContain('node_modules/@notifee/react-native/android/libs');
      expect(androidBuildGradleSource).toContain('allprojects');
      expect(androidBuildGradleSource).toContain('repositories');
      return;
    }

    expect(existsSync(androidBuildGradlePath)).toBe(false);
  });

  it('routes sync failure feedback through the shared error presenter instead of expo local notifications', () => {
    const syncServiceSource = readFileSync(join(__dirname, '../../src/services/SyncService.ts'), 'utf8');

    expect(syncServiceSource).toContain('presentErrorMessage(');
    expect(syncServiceSource).not.toContain('NotificationService');
    expect(syncServiceSource).not.toContain('showLocalNotification(');
    expect(syncServiceSource).not.toContain('showErrorMessage(');
  });
});
