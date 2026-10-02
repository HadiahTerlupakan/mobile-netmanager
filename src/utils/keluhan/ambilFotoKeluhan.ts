import * as ImagePicker from 'expo-image-picker';

import { perkecilFoto } from '@/utils/perkecilFoto';

/** Lebar maksimal foto keluhan; cukup untuk melihat lampu modem / layar speedtest. */
const LEBAR_FOTO = 1280;
const KUALITAS_FOTO = 0.7;

export type SumberFoto = 'kamera' | 'galeri';

/** Pesan bila izin kamera / galeri ditolak. */
export const PESAN_IZIN_FOTO_DITOLAK: Readonly<Record<SumberFoto, string>> = {
  kamera: 'Izinkan akses kamera di pengaturan HP untuk memotret kondisi di lokasi.',
  galeri: 'Izinkan akses galeri di pengaturan HP untuk memilih foto dari pelanggan.',
};

/** Hasil mengambil satu foto: URI lokal yang sudah diperkecil, batal, atau izin ditolak. */
export type HasilAmbilFoto = { status: 'ok'; uri: string } | { status: 'batal' } | { status: 'izin-ditolak' };

/**
 * Ambil satu foto keluhan dari kamera atau galeri (mis. foto yang dikirim
 * pelanggan lewat WhatsApp), lalu perkecil sebelum diunggah.
 */
export async function ambilFotoKeluhan(sumber: SumberFoto): Promise<HasilAmbilFoto> {
  const izin =
    sumber === 'kamera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) return { status: 'izin-ditolak' };

  const opsi: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: KUALITAS_FOTO };
  const hasil =
    sumber === 'kamera' ? await ImagePicker.launchCameraAsync(opsi) : await ImagePicker.launchImageLibraryAsync(opsi);
  if (hasil.canceled || !hasil.assets[0]) return { status: 'batal' };

  return { status: 'ok', uri: await perkecilFoto(hasil.assets[0].uri, { lebar: LEBAR_FOTO, kualitas: KUALITAS_FOTO }) };
}
