import * as ImagePicker from 'expo-image-picker';

import { perkecilFoto } from '@/utils/perkecilFoto';

export type SumberFotoBukti = 'kamera' | 'galeri';

/** Berkas bukti transfer siap diunggah, dengan MIME yang sebenarnya. */
export interface FotoBukti {
  uri: string;
  nama: string;
  mimeType: string;
}

export type HasilAmbilBukti = { status: 'ok'; foto: FotoBukti } | { status: 'batal' } | { status: 'izin-ditolak' };

/** Format yang diterima server (diperiksa dari isi berkas, bukan ekstensinya). */
const MIME_DITERIMA_SERVER = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UKURAN_MAKS_BYTE = 5 * 1024 * 1024;
/** Cukup untuk membaca nominal dan nomor rekening di tangkapan layar m-banking. */
const LEBAR_MAKS = 2000;
const KUALITAS_FOTO = 0.8;
const NAMA_BERKAS_JPEG = 'bukti-transfer.jpg';
const MIME_JPEG = 'image/jpeg';

function isBisaDikirimApaAdanya(aset: ImagePicker.ImagePickerAsset): boolean {
  const isFormatDiterima = Boolean(aset.mimeType && MIME_DITERIMA_SERVER.has(aset.mimeType));
  // Lebar 0 berarti sistem tidak melaporkannya; ukurannya tidak bisa dipastikan.
  const isLebarWajar = aset.width > 0 && aset.width <= LEBAR_MAKS;
  return isFormatDiterima && isLebarWajar && (aset.fileSize ?? 0) <= UKURAN_MAKS_BYTE;
}

/**
 * Foto yang diterima server apa adanya dikirim dengan MIME aslinya; selain
 * itu (HEIC, MIME tak diketahui, foto kamera beresolusi besar, berkas di atas
 * 5 MB) dikompres ulang menjadi JPEG tanpa memperbesar foto yang kecil.
 */
async function siapkanFotoBukti(aset: ImagePicker.ImagePickerAsset): Promise<FotoBukti> {
  if (isBisaDikirimApaAdanya(aset)) {
    return { uri: aset.uri, nama: aset.fileName || aset.uri.split('/').pop() || NAMA_BERKAS_JPEG, mimeType: aset.mimeType! };
  }
  const lebar = aset.width > 0 ? Math.min(aset.width, LEBAR_MAKS) : LEBAR_MAKS;
  const uri = await perkecilFoto(aset.uri, { lebar, kualitas: KUALITAS_FOTO });
  return { uri, nama: NAMA_BERKAS_JPEG, mimeType: MIME_JPEG };
}

/**
 * Ambil foto bukti transfer dari kamera atau galeri, tanpa pemotongan paksa.
 * Galeri tidak meminta izin: pemilih foto sistem tidak membutuhkannya, dan
 * READ_MEDIA_IMAGES memang diblokir app.json.
 */
export async function ambilFotoBukti(sumber: SumberFotoBukti): Promise<HasilAmbilBukti> {
  if (sumber === 'kamera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return { status: 'izin-ditolak' };

  const opsi: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: KUALITAS_FOTO };
  const hasil = sumber === 'kamera' ? await ImagePicker.launchCameraAsync(opsi) : await ImagePicker.launchImageLibraryAsync(opsi);
  const aset = hasil.canceled ? undefined : hasil.assets?.[0];
  if (!aset) return { status: 'batal' };

  return { status: 'ok', foto: await siapkanFotoBukti(aset) };
}
