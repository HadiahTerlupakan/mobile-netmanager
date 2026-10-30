import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const NAMA_BERKAS = 'qris-pembayaran.png';
const IZIN_DIBERIKAN = 'granted';
/** Hanya menulis ke galeri; tidak perlu izin membaca foto pelanggan. */
const HANYA_TULIS = true;

/** Simpan PNG QRIS (base64 tanpa prefiks) ke galeri agar bisa dibuka dari aplikasi e-wallet. */
export async function simpanQrisKeGaleri(base64Png: string): Promise<'tersimpan' | 'ditolak'> {
  const izin = await MediaLibrary.requestPermissionsAsync(HANYA_TULIS);
  if (izin.status !== IZIN_DIBERIKAN) return 'ditolak';

  const uri = `${FileSystem.cacheDirectory}${NAMA_BERKAS}`;
  await FileSystem.writeAsStringAsync(uri, base64Png, { encoding: FileSystem.EncodingType.Base64 });
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'tersimpan';
}
