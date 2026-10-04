import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Lebar PNG hasil; cukup tajam untuk dicetak, tetap jauh di bawah batas unggah server. */
const LEBAR_GAMBAR_PX = 900;

/** Tangkap kotak tanda tangan menjadi data URL PNG (`data:image/png;base64,...`). */
export async function tangkapTandaTangan(refKotak: RefObject<View | null>): Promise<string> {
  return captureRef(refKotak, { format: 'png', quality: 1, result: 'data-uri', width: LEBAR_GAMBAR_PX });
}
