import { useCallback, useState } from 'react';

import { JUMLAH_FOTO_KEGIATAN_MAKS } from '@/constants/presurvei';
import {
  NILAI_FORM_KEGIATAN_KOSONG,
  validasiFormKegiatan,
  type IsianProspekBaru,
  type KesalahanFormKegiatan,
  type NilaiFormKegiatan,
} from '@/utils/presurvei/formKegiatan';
import type { TitikGps } from '@/utils/presurvei/lokasiGps';

/**
 * State dan aksi form catat kegiatan. `ubah`, `ubahProspekBaru`, `tambahFoto`,
 * `hapusFoto`, dan `reset` bereferensi stabil antar-render (lihat test
 * "fungsi pengubah stabil antar render"). Hook ini TIDAK pernah mereset
 * dirinya sendiri saat `periksa` gagal atau simpan gagal — reset hanya
 * terjadi lewat pemanggilan eksplisit `reset()` setelah simpan sukses
 * (carry Task 9/11: isian tidak boleh hilang saat mutasi gagal).
 */
export interface FormKegiatan {
  nilai: NilaiFormKegiatan;
  fotoLokal: string[];
  kesalahan: KesalahanFormKegiatan;
  ubah: (perubahan: Partial<NilaiFormKegiatan>) => void;
  ubahProspekBaru: (perubahan: Partial<IsianProspekBaru>) => void;
  tambahFoto: (uri: string) => void;
  hapusFoto: (uri: string) => void;
  periksa: (titik: TitikGps | null) => boolean;
  reset: (awal: Partial<NilaiFormKegiatan>) => void;
}

function useFotoKegiatan() {
  const [fotoLokal, setFotoLokal] = useState<string[]>([]);
  const tambahFoto = useCallback((uri: string) => {
    setFotoLokal((lama) => (lama.length >= JUMLAH_FOTO_KEGIATAN_MAKS ? lama : [...lama, uri]));
  }, []);
  const hapusFoto = useCallback((uri: string) => {
    setFotoLokal((lama) => lama.filter((foto) => foto !== uri));
  }, []);
  const kosongkan = useCallback(() => setFotoLokal([]), []);
  return { fotoLokal, tambahFoto, hapusFoto, kosongkan };
}

function useNilaiKegiatan() {
  const [nilai, setNilai] = useState<NilaiFormKegiatan>(NILAI_FORM_KEGIATAN_KOSONG);
  const ubah = useCallback((perubahan: Partial<NilaiFormKegiatan>) => {
    setNilai((lama) => ({ ...lama, ...perubahan }));
  }, []);
  const ubahProspekBaru = useCallback((perubahan: Partial<IsianProspekBaru>) => {
    setNilai((lama) => ({ ...lama, prospekBaru: { ...lama.prospekBaru, ...perubahan } }));
  }, []);
  return { nilai, setNilai, ubah, ubahProspekBaru };
}

/** Form catat kegiatan; aturan validasi ada di `utils/presurvei/formKegiatan.ts`. */
export function useFormKegiatan(): FormKegiatan {
  const { nilai, setNilai, ubah, ubahProspekBaru } = useNilaiKegiatan();
  const { fotoLokal, tambahFoto, hapusFoto, kosongkan } = useFotoKegiatan();
  const [kesalahan, setKesalahan] = useState<KesalahanFormKegiatan>({});

  const periksa = useCallback((titik: TitikGps | null) => {
    const hasil = validasiFormKegiatan(nilai, { titik, jumlahFoto: fotoLokal.length });
    setKesalahan(hasil);
    return Object.keys(hasil).length === 0;
  }, [nilai, fotoLokal.length]);

  const reset = useCallback((awal: Partial<NilaiFormKegiatan>) => {
    setNilai({ ...NILAI_FORM_KEGIATAN_KOSONG, ...awal });
    setKesalahan({});
    kosongkan();
  }, [setNilai, kosongkan]);

  return { nilai, fotoLokal, kesalahan, ubah, ubahProspekBaru, tambahFoto, hapusFoto, periksa, reset };
}
