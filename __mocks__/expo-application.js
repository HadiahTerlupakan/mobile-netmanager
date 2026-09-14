/**
 * Modul native `expo-application` tidak bisa dimuat di lingkungan jest.
 *
 * `nativeBuildVersion` sengaja bernilai null: tes yang peduli pada nilai ini
 * meneruskannya sendiri sebagai argumen ke `resolveAppVersion`, sementara kode
 * lain harus tetap berjalan lewat jalur cadangannya.
 */
module.exports = {
  nativeBuildVersion: null,
  nativeApplicationVersion: null,
  applicationId: 'com.netmanager.mobile',
};
