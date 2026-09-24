import { useCallback, useState } from 'react';

import {
  NILAI_FORM_KONVERSI_KOSONG,
  validasiFormKonversi,
  type KesalahanFormKonversi,
  type NilaiFormKonversi,
} from '@/utils/presurvei/formKonversi';

/** State form Jadikan Canvasing: nilai, foto KTP lokal, dan validasi saat kirim. */
export function useFormKonversi() {
  const [nilai, setNilai] = useState<NilaiFormKonversi>(NILAI_FORM_KONVERSI_KOSONG);
  const [fotoKtpLokal, setFotoKtpLokal] = useState<string | null>(null);
  const [kesalahan, setKesalahan] = useState<KesalahanFormKonversi>({});

  const ubah = useCallback((perubahan: Partial<NilaiFormKonversi>) => {
    setNilai((lama) => ({ ...lama, ...perubahan }));
  }, []);

  /** Validasi nilai saat ini; hasilnya disimpan ke `kesalahan` dan dikembalikan sebagai boolean. */
  const periksa = useCallback(() => {
    const hasil = validasiFormKonversi(nilai, fotoKtpLokal);
    setKesalahan(hasil);
    return Object.keys(hasil).length === 0;
  }, [nilai, fotoKtpLokal]);

  return { nilai, ubah, fotoKtpLokal, setFotoKtpLokal, kesalahan, periksa };
}
