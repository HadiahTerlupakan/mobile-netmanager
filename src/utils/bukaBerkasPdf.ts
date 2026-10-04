import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const MIME_PDF = 'application/pdf';
const UTI_PDF = 'com.adobe.pdf';
const AKSI_LIHAT_ANDROID = 'android.intent.action.VIEW';
/** `Intent.FLAG_GRANT_READ_URI_PERMISSION`: aplikasi pembaca PDF boleh membaca content URI kita. */
const FLAG_IZIN_BACA_URI = 1;

/** Bagikan / pratinjau PDF lewat lembar bagikan sistem (iOS punya pratinjau Quick Look). */
async function bagikanPdf(uriLokal: string): Promise<void> {
  await Sharing.shareAsync(uriLokal, { mimeType: MIME_PDF, UTI: UTI_PDF, dialogTitle: 'Buka dokumen' });
}

/** Buka PDF di aplikasi pembaca PDF Android; tanpa aplikasi pembaca, jatuh ke lembar bagikan. */
async function bukaPdfAndroid(uriLokal: string): Promise<void> {
  const uriKonten = await FileSystem.getContentUriAsync(uriLokal);
  try {
    await IntentLauncher.startActivityAsync(AKSI_LIHAT_ANDROID, { data: uriKonten, type: MIME_PDF, flags: FLAG_IZIN_BACA_URI });
  } catch {
    await bagikanPdf(uriLokal);
  }
}

/** Buka berkas PDF lokal dengan penampil bawaan perangkat (tanpa modul native baru). */
export async function bukaBerkasPdf(uriLokal: string): Promise<void> {
  if (Platform.OS === 'android') {
    await bukaPdfAndroid(uriLokal);
    return;
  }
  await bagikanPdf(uriLokal);
}
