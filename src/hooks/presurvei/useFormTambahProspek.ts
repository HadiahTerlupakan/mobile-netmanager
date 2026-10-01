import { useState } from 'react';

import { useIsOnline } from '@/hooks/useIsOnline';
import type { ProspekListItem } from '@/types/presurvei';
import {
  NILAI_FORM_PROSPEK_KOSONG,
  alamatSetelahLokasi,
  keMuatanBuatProspek,
  validasiFormProspek,
  type KesalahanFormProspek,
  type MedanFormProspek,
  type NilaiFormProspek,
} from '@/utils/presurvei/formProspek';
import { useLokasiProspek, type StatusLokasiProspek } from './useLokasiProspek';
import { useSimpanProspek, type DuplikatMenunggu } from './useSimpanProspek';

/** Pilihan saat nomor HP sudah tercatat: pakai yang ada, tetap simpan baru, atau batal. */
export interface PilihanDuplikat extends DuplikatMenunggu {
  tetapSimpanBaru: () => void;
}

export interface FormTambahProspek {
  nilai: NilaiFormProspek;
  kesalahan: KesalahanFormProspek;
  ubah: (perubahan: Partial<NilaiFormProspek>) => void;
  statusLokasi: StatusLokasiProspek;
  pakaiLokasiSekarang: () => void;
  isOnline: boolean;
  isMenyimpan: boolean;
  simpan: () => void;
  duplikat: PilihanDuplikat | null;
}

/**
 * Medan yang kesalahannya gugur oleh sebuah perubahan: medan itu sendiri,
 * plus isian yang muncul/hilang karenanya (ganti jenis menyembunyikan
 * peran/paket; ganti peran mengubah arti keterangannya).
 */
function medanTerdampak(perubahan: Partial<NilaiFormProspek>): string[] {
  const medan: string[] = Object.keys(perubahan);
  if (perubahan.jenis !== undefined) medan.push('peranPilihan', 'peranKeterangan', 'paketDiminati');
  if (perubahan.peranPilihan !== undefined) medan.push('peranKeterangan');
  return medan;
}

/** Buang kesalahan medan yang baru diubah supaya tulisan merah hilang saat sales memperbaiki. */
function tanpaKesalahanMedan(kesalahan: KesalahanFormProspek, medan: string[]): KesalahanFormProspek {
  const sisa = { ...kesalahan };
  for (const nama of medan) delete sisa[nama as MedanFormProspek];
  return sisa;
}

/**
 * Logika form Tambah Prospek (calon pelanggan atau perantara): isian, validasi (aturan di
 * `utils/presurvei/formProspek.ts`), lokasi opsional, dan simpan online.
 * Mengubah nomor HP menutup pilihan nomor ganda karena sudah tidak berlaku.
 */
export function useFormTambahProspek(onBerhasil: (prospek: ProspekListItem) => void): FormTambahProspek {
  const [nilai, setNilai] = useState<NilaiFormProspek>(NILAI_FORM_PROSPEK_KOSONG);
  const [kesalahan, setKesalahan] = useState<KesalahanFormProspek>({});
  const isOnline = useIsOnline();
  const lokasi = useLokasiProspek();
  const penyimpan = useSimpanProspek(onBerhasil);

  const ubah = (perubahan: Partial<NilaiFormProspek>) => {
    setNilai((lama) => ({ ...lama, ...perubahan }));
    setKesalahan((lama) => tanpaKesalahanMedan(lama, medanTerdampak(perubahan)));
    if (perubahan.noTelp !== undefined) penyimpan.duplikat?.batal();
  };

  const pakaiLokasiSekarang = () => {
    lokasi.cari((titik, alamatLokasi) => {
      setNilai((lama) => ({ ...lama, titik, alamat: alamatSetelahLokasi(lama.alamat, alamatLokasi) }));
      if (alamatLokasi.trim() !== '') setKesalahan((lama) => tanpaKesalahanMedan(lama, ['alamat']));
    });
  };

  const kirimBila = (isAbaikanDuplikat: boolean) => {
    if (!isOnline || penyimpan.isMenyimpan) return;
    const kesalahanBaru = validasiFormProspek(nilai);
    setKesalahan(kesalahanBaru);
    if (Object.keys(kesalahanBaru).length > 0) return;
    penyimpan.kirim(keMuatanBuatProspek(nilai, isAbaikanDuplikat));
  };

  return {
    nilai,
    kesalahan,
    ubah,
    statusLokasi: lokasi.status,
    pakaiLokasiSekarang,
    isOnline,
    isMenyimpan: penyimpan.isMenyimpan,
    simpan: () => kirimBila(false),
    duplikat: penyimpan.duplikat ? { ...penyimpan.duplikat, tetapSimpanBaru: () => kirimBila(true) } : null,
  };
}
