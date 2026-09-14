import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('firebase/app', () => ({}));
jest.mock('firebase/auth', () => ({}));

import { resolveFirebaseWebConfig } from '../../src/services/firebaseApp';

/**
 * Firebase JS SDK (Auth, Firestore, Realtime Database) memanggil REST API
 * Google dari JavaScript. Key Android dari google-services.json dibatasi untuk
 * aplikasi native, dan panggilan JS tidak membawa identitas paket Android —
 * Google menolaknya:
 *
 *   403 Requests from this Android client application <empty> are blocked.
 *
 * Nilai bawaan di kode dulu memakai konfigurasi Android itu. Setiap bundle yang
 * dibangun tanpa env EXPO_PUBLIC_FIREBASE_* tetap "berhasil" dibangun, lalu
 * chat dan realtime work order mati diam-diam di perangkat — kegagalannya
 * hanya tercatat lewat logger.warn, tidak pernah sampai ke backend. OTA
 * 8f311761 terbit persis seperti itu dan menjangkau semua perangkat build 46.
 */
describe('konfigurasi Firebase web', () => {
  it('memakai app id web ketika tidak ada env', () => {
    expect(resolveFirebaseWebConfig({}).appId).toMatch(/^1:\d+:web:[0-9a-f]+$/);
  });

  it('tidak memakai key Android sebagai nilai bawaan', () => {
    // Key ini milik klien Android di google-services.json (berkas itu
    // di-.gitignore, jadi nilainya dipatok di sini). Google menolaknya untuk
    // panggilan dari JS SDK.
    const KEY_ANDROID_TERBATAS = 'AIzaSyBqMwLWuAurtJnVQ93CFlb5hLYSzQ57UZQ';

    expect(resolveFirebaseWebConfig({}).apiKey).not.toBe(KEY_ANDROID_TERBATAS);
  });

  it('menolak app id Android yang disuntik lewat env', () => {
    // .env.local pengembang pernah berisi konfigurasi Android. Menerimanya
    // diam-diam menghasilkan bundle yang terlihat normal tapi rusak.
    expect(() =>
      resolveFirebaseWebConfig({
        EXPO_PUBLIC_FIREBASE_APP_ID: '1:43187781340:android:903ae303566575e8e67e19',
      })
    ).toThrow(/web/);
  });

  it('tetap mengizinkan env web menimpa nilai bawaan', () => {
    const config = resolveFirebaseWebConfig({
      EXPO_PUBLIC_FIREBASE_APP_ID: '1:111:web:abc123',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'proyek-lain',
    });

    expect(config.appId).toBe('1:111:web:abc123');
    expect(config.projectId).toBe('proyek-lain');
  });
});

describe('pemuatan modul dengan env Android', () => {
  it('tidak menjatuhkan aplikasi dan jatuh ke konfigurasi web', () => {
    // Modul dimuat saat startup. Crash di sini mengunci teknisi dari seluruh
    // aplikasi, bukan hanya realtime.
    jest.resetModules();
    const semula = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:43187781340:android:903ae303566575e8e67e19';

    try {
      expect(() => require('../../src/services/firebaseApp')).not.toThrow();
    } finally {
      if (semula === undefined) delete process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
      else process.env.EXPO_PUBLIC_FIREBASE_APP_ID = semula;
    }
  });
});
