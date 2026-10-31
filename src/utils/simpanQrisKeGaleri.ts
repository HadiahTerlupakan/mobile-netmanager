import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

const NAMA_BERKAS = 'qris-pembayaran.png';
const IZIN_DIBERIKAN = 'granted';
/** Hanya menulis ke galeri; tidak perlu izin membaca foto pelanggan. */
const HANYA_TULIS = true;
/**
 * Di bawah Android 13 (API 33) expo-media-library butuh WRITE_EXTERNAL_STORAGE,
 * yang diblokir `blockedPermissions` app.json. Membuka izin itu berarti build
 * native baru; membagikan gambarnya bisa dikirim lewat OTA.
 */
const API_ANDROID_GALERI_TANPA_IZIN_TULIS = 33;

/** `dibagikan`: menu berbagi dibuka, pelanggan memilih simpan ke galeri atau aplikasi e-wallet. */
export type HasilSimpanQris = 'tersimpan' | 'dibagikan' | 'ditolak';

function isGaleriBisaDitulis(): boolean {
  return Platform.OS !== 'android' || Number(Platform.Version) >= API_ANDROID_GALERI_TANPA_IZIN_TULIS;
}

async function bagikanQris(uri: string): Promise<HasilSimpanQris> {
  if (!(await Sharing.isAvailableAsync())) return 'ditolak';
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Simpan atau bagikan QRIS', UTI: 'public.png' });
  return 'dibagikan';
}

async function simpanKeGaleri(uri: string): Promise<HasilSimpanQris> {
  const izin = await MediaLibrary.requestPermissionsAsync(HANYA_TULIS);
  if (izin.status !== IZIN_DIBERIKAN) return bagikanQris(uri);
  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'tersimpan';
  } catch (error) {
    logger.warn('[CustomerTagihan] Saving QRIS to gallery failed, sharing instead', error);
    return bagikanQris(uri);
  }
}

/**
 * Simpan PNG QRIS (base64 tanpa prefiks) ke galeri agar bisa dibuka dari
 * aplikasi e-wallet; bila galeri tidak bisa ditulis, gambarnya dibagikan.
 */
export async function simpanQrisKeGaleri(base64Png: string): Promise<HasilSimpanQris> {
  const uri = `${FileSystem.cacheDirectory}${NAMA_BERKAS}`;
  await FileSystem.writeAsStringAsync(uri, base64Png, { encoding: FileSystem.EncodingType.Base64 });
  return isGaleriBisaDitulis() ? simpanKeGaleri(uri) : bagikanQris(uri);
}
