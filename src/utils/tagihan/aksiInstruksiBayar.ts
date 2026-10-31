import * as Clipboard from 'expo-clipboard';

import { presentErrorMessage, presentInfoMessage, presentSuccessMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { simpanQrisKeGaleri } from '@/utils/simpanQrisKeGaleri';

/** Salin nomor VA, rekening, atau nominal instruksi bayar. */
export async function salinInstruksi(teks: string, label: string) {
  try {
    await Clipboard.setStringAsync(teks);
    presentInfoMessage(`${label} berhasil disalin!`, 'Disalin');
  } catch (error) {
    logger.error('[CustomerTagihan] Failed to copy payment detail', error);
    presentErrorMessage(`Gagal menyalin ${label}.`);
  }
}

/** Simpan (atau bagikan) gambar QRIS; menu berbagi sudah menjadi umpan baliknya sendiri. */
export async function simpanQris(base64Png: string) {
  try {
    const hasil = await simpanQrisKeGaleri(base64Png);
    if (hasil === 'ditolak') {
      presentInfoMessage('Izinkan akses Galeri agar gambar QRIS bisa disimpan.', 'Izin Ditolak');
    } else if (hasil === 'tersimpan') {
      presentSuccessMessage('QRIS tersimpan di Galeri. Buka aplikasi e-wallet, pilih Scan lalu ambil dari Galeri.');
    }
  } catch (error) {
    logger.error('[CustomerTagihan] Failed to save QRIS', error);
    presentErrorMessage('Gagal menyimpan gambar QRIS.');
  }
}
