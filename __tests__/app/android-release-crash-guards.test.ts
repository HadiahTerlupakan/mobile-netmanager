import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Penjaga dua crash produksi versi 48 (1.0.9) di Play Console.
 */

const bacaJson = (berkas: string) =>
  JSON.parse(readFileSync(join(__dirname, '../..', berkas), 'utf8'));

function aturanProguard(): string {
  const plugin = bacaJson('app.json').expo.plugins.find(
    (entry: unknown) => Array.isArray(entry) && entry[0] === 'expo-build-properties',
  );
  return plugin[1].android.extraProguardRules;
}

describe('crash rilis Android', () => {
  // TaskService.executeTask NullPointerException: saat OS membangunkan task
  // lokasi sementara proses aplikasi mati, expo memuat loader headless lewat
  // Class.forName dengan nama dari manifest. Tanpa aturan ini R8 boleh
  // mengganti nama class-nya, loader-nya null, dan aplikasi crash.
  it('R8 mempertahankan nama loader headless yang dimuat lewat refleksi', () => {
    expect(aturanProguard()).toContain(
      '-keep class expo.modules.adapters.react.apploader.RNHeadlessAppLoader',
    );
  });

  // RawPropsParser::prepare<RNCAndroidDialogPickerProps> SIGABRT/SIGSEGV:
  // picker 2.11.1 tidak meneruskan RN_SERIALIZABLE_STATE ke CMake, sehingga
  // struct props-nya beda layout dengan React Native 0.81. Diperbaiki 2.11.3.
  it('picker memakai versi yang sudah kompatibel dengan React Native 0.81', () => {
    const versi: string = bacaJson('package.json').dependencies['@react-native-picker/picker'];
    const [major, minor, patch] = versi.replace(/^[~^]/, '').split('.').map(Number);

    expect(major * 10000 + minor * 100 + patch).toBeGreaterThanOrEqual(21103);
  });
});
