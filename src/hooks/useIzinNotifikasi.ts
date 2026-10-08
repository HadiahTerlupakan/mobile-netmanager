/**
 * Keadaan pre-prompt izin notifikasi untuk layar yang menampilkannya.
 *
 * Pemisahan dari `services/izinNotifikasi` disengaja: service memutuskan
 * "apakah perlu bertanya" dan mencatat jawabannya, hook ini hanya menerjemahkan
 * keputusan itu menjadi keadaan tampilan.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  aktifkanNotifikasi,
  catatIzinNotifikasiSudahDitanya,
  perluTanyaIzinNotifikasi,
} from '@/services/izinNotifikasi';
import { logger } from '@/utils/logger';

interface KeadaanIzinNotifikasi {
  /** Pre-prompt sedang perlu ditampilkan. */
  tampil: boolean;
  /** Pengguna menekan "Aktifkan": lanjut ke dialog izin OS. */
  setuju: () => void;
  /** Pengguna menekan "Nanti saja". */
  tolak: () => void;
}

export function useIzinNotifikasi(): KeadaanIzinNotifikasi {
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    let masihTerpasang = true;

    void perluTanyaIzinNotifikasi()
      .then((perlu) => {
        if (masihTerpasang) setTampil(perlu);
      })
      .catch((error) => {
        // Gagal membaca status izin bukan alasan menampilkan dialog yang
        // mungkin tidak perlu — diam lebih baik daripada mengganggu.
        logger.warn('[IzinNotifikasi] Gagal memeriksa status izin:', error);
      });

    return () => {
      masihTerpasang = false;
    };
  }, []);

  const tutupDanCatat = useCallback(async () => {
    setTampil(false);
    await catatIzinNotifikasiSudahDitanya();
  }, []);

  const setuju = useCallback(() => {
    void (async () => {
      await tutupDanCatat();
      await aktifkanNotifikasi();
    })();
  }, [tutupDanCatat]);

  const tolak = useCallback(() => {
    void tutupDanCatat();
  }, [tutupDanCatat]);

  return { tampil, setuju, tolak };
}
