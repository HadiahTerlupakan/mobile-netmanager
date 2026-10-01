import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocationWithTimeout } from '@/hooks/useLocationWithTimeout';
import { bacaTitikGps } from '@/utils/presurvei/lokasiGps';
import type { TitikProspek } from '@/utils/presurvei/formProspek';

/** Batas tunggu GPS untuk lokasi prospek. */
const BATAS_TUNGGU_LOKASI_MS = 15_000;

export type StatusLokasiProspek = 'belum' | 'mencari' | 'tersimpan' | 'gagal';

/** Teks status yang tampil di bawah tombol lokasi. */
export const TEKS_LOKASI_PROSPEK: Record<StatusLokasiProspek, string> = {
  belum: '',
  mencari: 'Mencari lokasi…',
  tersimpan: 'Lokasi tersimpan ✓',
  gagal: 'Lokasi tidak ditemukan, tulis alamat saja',
};

export interface LokasiProspek {
  status: StatusLokasiProspek;
  /** Cari lokasi sekarang; `onDapat` menerima titik dan alamat hasil pembacaan peta. */
  cari: (onDapat: (titik: TitikProspek, alamat: string) => void) => void;
}

/**
 * Lokasi opsional prospek dari tombol "Pakai lokasi saya sekarang".
 * Hasil pencarian yang sudah digantikan, atau yang tiba setelah form ditutup,
 * diabaikan.
 */
export function useLokasiProspek(): LokasiProspek {
  const { getLocationWithTimeout } = useLocationWithTimeout();
  const [status, setStatus] = useState<StatusLokasiProspek>('belum');
  const nomorPencarian = useRef(0);

  useEffect(() => () => {
    // Lepas form: hasil yang masih ditunggu tidak boleh menyentuh state lagi.
    nomorPencarian.current += 1;
  }, []);

  const cari = useCallback<LokasiProspek['cari']>((onDapat) => {
    nomorPencarian.current += 1;
    const nomor = nomorPencarian.current;
    setStatus('mencari');
    void getLocationWithTimeout(null, BATAS_TUNGGU_LOKASI_MS).then((hasil) => {
      if (nomor !== nomorPencarian.current) return;
      const titik = bacaTitikGps(hasil);
      if (titik === null) {
        setStatus('gagal');
        return;
      }
      setStatus('tersimpan');
      onDapat({ latitude: titik.latitude, longitude: titik.longitude }, hasil.locationName);
    });
  }, [getLocationWithTimeout]);

  return { status, cari };
}
