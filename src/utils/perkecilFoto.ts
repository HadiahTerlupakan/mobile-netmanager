import * as ImageManipulator from 'expo-image-manipulator';

/** Perkecil foto ke lebar tertentu sebagai JPEG sebelum diunggah; mengembalikan URI baru. */
export async function perkecilFoto(uri: string, opsi: { lebar: number; kualitas: number }): Promise<string> {
  const hasil = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: opsi.lebar } }], {
    compress: opsi.kualitas,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return hasil.uri;
}
