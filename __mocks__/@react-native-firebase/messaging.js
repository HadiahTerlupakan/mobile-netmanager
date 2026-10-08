/**
 * Pengganti `@react-native-firebase/messaging` untuk jest.
 *
 * Modul aslinya menyentuh native module `RNFBAppModule` saat di-import — bukan
 * saat dipanggil — sehingga setiap berkas yang berada di jalur import-nya ikut
 * gagal dimuat di jest, termasuk layar yang hanya kebetulan merender komponen
 * izin notifikasi. Pengganti ini membuat jalur import itu tidak berbahaya;
 * pengujian yang benar-benar menguji perilaku FCM tetap memasang mock-nya
 * sendiri lewat `jest.mock`.
 */

const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  EPHEMERAL: 3,
};

module.exports = {
  AuthorizationStatus,
  getMessaging: jest.fn(() => ({
    hasPermission: jest.fn(async () => AuthorizationStatus.DENIED),
  })),
  getToken: jest.fn(async () => null),
  deleteToken: jest.fn(async () => undefined),
  requestPermission: jest.fn(async () => AuthorizationStatus.DENIED),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
  registerDeviceForRemoteMessages: jest.fn(async () => undefined),
  onTokenRefresh: jest.fn(() => () => undefined),
};
