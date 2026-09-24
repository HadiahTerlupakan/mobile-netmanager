import * as ImageManipulator from 'expo-image-manipulator';

/** Lebar foto bukti setelah diperkecil (pola `canvasing/create.tsx:147-160`). */
export const LEBAR_FOTO_BUKTI = 1024;

/** Kualitas JPEG foto bukti. */
export const KUALITAS_FOTO_BUKTI = 0.7;

/** Perkecil foto kamera ke lebar 1024, JPEG 0.7; mengembalikan URI baru. */
export async function perkecilFoto(uri: string): Promise<string> {
  const hasil = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: LEBAR_FOTO_BUKTI } }],
    { compress: KUALITAS_FOTO_BUKTI, format: ImageManipulator.SaveFormat.JPEG },
  );
  return hasil.uri;
}
