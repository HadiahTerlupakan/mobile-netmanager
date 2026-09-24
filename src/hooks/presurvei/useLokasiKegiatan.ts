import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocationWithTimeout } from '@/hooks/useLocationWithTimeout';
import {
  KEADAAN_LOKASI_AWAL,
  KEADAAN_LOKASI_IZIN_DITOLAK,
  KEADAAN_LOKASI_MENCARI,
  keadaanDariHasil,
  type KeadaanLokasi,
} from '@/utils/presurvei/lokasiGps';

/** Batas tunggu fix GPS kegiatan. */
const BATAS_TUNGGU_GPS_MS = 20_000;

/** Keadaan lokasi kegiatan beserta pemicu pencarian ulang. */
export interface LokasiKegiatan extends KeadaanLokasi {
  cari: () => void;
}

/**
 * Lokasi GPS kegiatan lapangan. Tiap pencarian membuang titik lama supaya
 * simpan terblokir sampai titik baru didapat; hasil pencarian yang sudah
 * digantikan, atau yang datang setelah layar dilepas, diabaikan. Bila GPS
 * gagal karena izin ditolak, statusnya dibedakan dari kegagalan GPS biasa
 * (lihat `KEADAAN_LOKASI_IZIN_DITOLAK`) supaya sales tahu harus membuka
 * pengaturan izin, bukan mengira GPS-nya mati.
 */
export function useLokasiKegiatan(): LokasiKegiatan {
  const { getLocationWithTimeout } = useLocationWithTimeout();
  const [keadaan, setKeadaan] = useState<KeadaanLokasi>(KEADAAN_LOKASI_AWAL);
  const nomorPencarian = useRef(0);

  const cari = useCallback(() => {
    nomorPencarian.current += 1;
    const nomor = nomorPencarian.current;
    setKeadaan(KEADAAN_LOKASI_MENCARI);
    void getLocationWithTimeout(null, BATAS_TUNGGU_GPS_MS, Location.Accuracy.High).then(async (hasil) => {
      if (nomor !== nomorPencarian.current) return;
      const keadaanBaru = keadaanDariHasil(hasil);
      if (keadaanBaru.status !== 'gagal') {
        setKeadaan(keadaanBaru);
        return;
      }
      // Kegagalan tanpa koordinat bisa berarti izin ditolak, bukan cuma GPS
      // lambat/mati — cek status izin (tanpa memicu dialog OS) untuk membedakan.
      const izin = await Location.getForegroundPermissionsAsync();
      if (nomor !== nomorPencarian.current) return;
      setKeadaan(izin.status === Location.PermissionStatus.GRANTED ? keadaanBaru : KEADAAN_LOKASI_IZIN_DITOLAK);
    });
  }, [getLocationWithTimeout]);

  useEffect(() => () => {
    // Tandai pencarian yang sedang berjalan sebagai usang sehingga hasil yang
    // datang setelah unmount tidak pernah memicu setState.
    nomorPencarian.current += 1;
  }, []);

  return { ...keadaan, cari };
}
