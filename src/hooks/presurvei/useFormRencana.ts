import { useCallback, useState } from 'react';

import type { ProspekListItem } from '@/types/presurvei';
import {
  validasiFormRencana,
  type KesalahanFormRencana,
  type NilaiFormRencana,
} from '@/utils/presurvei/formRencana';

export type JenisPeranProspek = Pick<ProspekListItem, 'jenis' | 'peran'>;

/** Prospek yang bisa dipilih; jenis/peran opsional (tanpanya dianggap calon pelanggan). */
export type ProspekPilihanRencana = Pick<ProspekListItem, 'id' | 'nama' | 'alamat'> &
  Partial<Pick<ProspekListItem, 'jenis' | 'peran'>>;

/** State dan aksi form rencana; `ubah` dan `reset` stabil antar-render. */
export interface FormRencana {
  nilai: NilaiFormRencana;
  namaProspek: string | null;
  /** Jenis & peran prospek terpilih (untuk lencana perantara); null bila tidak diketahui. */
  jenisProspek: JenisPeranProspek | null;
  /** Alamat prospek terpilih (untuk tombol "Pakai alamat prospek"); null bila tidak diketahui. */
  alamatProspek: string | null;
  kesalahan: KesalahanFormRencana;
  ubah: (perubahan: Partial<NilaiFormRencana>) => void;
  /** Pilih prospek; alamat kosong otomatis diisi alamat prospek. */
  pilihProspek: (prospek: ProspekPilihanRencana) => void;
  lepasProspek: () => void;
  /** Validasi terhadap `hariIni`; `tanggalAsal` = tanggal rencana saat diubah. */
  periksa: (hariIni: string, tanggalAsal?: string) => boolean;
  reset: (nilai: NilaiFormRencana, namaProspek: string | null) => void;
}

/** Form buat/ubah rencana; aturan validasi ada di `utils/presurvei/formRencana.ts`. */
export function useFormRencana(awal: NilaiFormRencana): FormRencana {
  const [nilai, setNilai] = useState<NilaiFormRencana>(awal);
  const [namaProspek, setNamaProspek] = useState<string | null>(null);
  const [alamatProspek, setAlamatProspek] = useState<string | null>(null);
  const [jenisProspek, setJenisProspek] = useState<JenisPeranProspek | null>(null);
  const [kesalahan, setKesalahan] = useState<KesalahanFormRencana>({});

  const ubah = useCallback((perubahan: Partial<NilaiFormRencana>) => {
    setNilai((lama) => ({ ...lama, ...perubahan }));
  }, []);

  const pilihProspek = useCallback((prospek: ProspekPilihanRencana) => {
    const alamat = prospek.alamat.trim();
    setNilai((lama) => ({
      ...lama,
      prospekId: prospek.id,
      alamat: lama.alamat.trim() === '' ? alamat : lama.alamat,
    }));
    setNamaProspek(prospek.nama);
    setAlamatProspek(alamat === '' ? null : alamat);
    setJenisProspek(prospek.jenis ? { jenis: prospek.jenis, peran: prospek.peran ?? null } : null);
  }, []);

  const lepasProspek = useCallback(() => {
    setNilai((lama) => ({ ...lama, prospekId: null }));
    setNamaProspek(null);
    setAlamatProspek(null);
    setJenisProspek(null);
  }, []);

  const periksa = useCallback((hariIni: string, tanggalAsal?: string) => {
    const hasil = validasiFormRencana(nilai, hariIni, tanggalAsal);
    setKesalahan(hasil);
    return Object.keys(hasil).length === 0;
  }, [nilai]);

  const reset = useCallback((baru: NilaiFormRencana, nama: string | null) => {
    setNilai(baru);
    setNamaProspek(nama);
    setAlamatProspek(null);
    setJenisProspek(null);
    setKesalahan({});
  }, []);

  return { nilai, namaProspek, jenisProspek, alamatProspek, kesalahan, ubah, pilihProspek, lepasProspek, periksa, reset };
}
