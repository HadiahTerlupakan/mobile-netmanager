import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { MuatanCatatKegiatan, ProspekListItem } from '@/types/presurvei';
import { keMuatanKegiatan } from '@/utils/presurvei/formKegiatan';
import type { TitikGps } from '@/utils/presurvei/lokasiGps';
import { bangunVariabelCatat, type VariabelCatatKegiatan } from '@/utils/presurvei/variabelCatat';
import { useCatatKegiatan } from './useCatatKegiatan';
import { useFormKegiatan, type FormKegiatan } from './useFormKegiatan';
import { useLokasiKegiatan } from './useLokasiKegiatan';

/**
 * Param route layar catat (dari "Catat Follow-up"). Sengaja `type`, bukan
 * `interface`: `useLocalSearchParams<T>()` menuntut `T` memenuhi
 * `Record<string, string | string[]>`, dan hanya alias tipe objek yang
 * mendapat index signature implisit.
 */
export type ParamCatatKegiatan = {
  prospekId?: string;
  prospekNama?: string;
};

/** Param kosong sama dengan tidak ada; form memakai `null`, bukan `''`. */
const teksParamAtauNull = (teks: string | undefined): string | null =>
  teks === undefined || teks === '' ? null : teks;

function useProspekTertaut(ubah: FormKegiatan['ubah']) {
  const [nama, setNama] = useState<string | null>(null);
  const pilih = (prospek: Pick<ProspekListItem, 'id' | 'nama'>) => {
    ubah({ prospekId: prospek.id, isBuatProspekBaru: false });
    setNama(prospek.nama);
  };
  const lepas = () => {
    ubah({ prospekId: null });
    setNama(null);
  };
  return { nama, setNama, pilih, lepas };
}

/** Upaya simpan yang gagal di server, disimpan agar simpan ulang memakai kunci yang sama. */
interface UpayaGagal {
  sidik: string;
  variabel: VariabelCatatKegiatan;
}

/** Sidik isi yang akan dikirim, tanpa `waktuMulai` yang selalu baru tiap tekan. */
function sidikUpaya(muatan: MuatanCatatKegiatan, fotoLokal: readonly string[]): string {
  const { waktuMulai: _waktuMulai, ...isi } = muatan;
  return JSON.stringify({ isi, fotoLokal });
}

/**
 * Satu niat simpan = satu `requestId`. Bila simpan gagal di server lalu
 * ditekan ulang tanpa isian berubah, variabel lama (requestId dan
 * `waktuMulai` yang sama) dipakai ulang: galat seperti 504 dari gateway bisa
 * datang setelah server sempat mencatat, dan kunci yang sama membuat server
 * men-dedupe alih-alih mencatat ganda. Isian yang berubah = niat baru, jadi
 * `bangunVariabelCatat` dipanggil sekali lagi untuk requestId baru.
 */
function useVariabelPerNiat() {
  const upayaGagal = useRef<UpayaGagal | null>(null);
  return (muatan: MuatanCatatKegiatan, fotoLokal: readonly string[]) => {
    const sidik = sidikUpaya(muatan, fotoLokal);
    const lama = upayaGagal.current;
    const variabel = lama !== null && lama.sidik === sidik ? lama.variabel : bangunVariabelCatat(muatan, fotoLokal);
    return {
      variabel,
      ingatGagal: () => {
        upayaGagal.current = { sidik, variabel };
      },
      lupakan: () => {
        upayaGagal.current = null;
      },
    };
  };
}

/**
 * Kirim sekali: ref menahan tekan beruntun sebelum `isPending` sempat
 * dirender ulang, dan dilepas di `onSettled` apa pun hasilnya. Galat tidak
 * mengosongkan form; layar hanya ditutup lewat `onSelesai` setelah sukses
 * (terkirim atau masuk antrean).
 */
function usePengirimKegiatan(form: FormKegiatan, titik: TitikGps | null, onSelesai: () => void) {
  const catat = useCatatKegiatan(() => onSelesai());
  const siapkanVariabel = useVariabelPerNiat();
  const isMengirim = useRef(false);
  const simpan = () => {
    if (isMengirim.current || !form.periksa(titik)) return;
    isMengirim.current = true;
    const muatan = keMuatanKegiatan(form.nilai, { titik, waktuMulai: new Date() });
    const upaya = siapkanVariabel(muatan, form.fotoLokal);
    catat.mutate(upaya.variabel, {
      onSuccess: upaya.lupakan,
      onError: upaya.ingatGagal,
      onSettled: () => {
        isMengirim.current = false;
      },
    });
  };
  return { simpan, isMenyimpan: catat.isPending };
}

/**
 * Isi alamat dari reverse geocode sekali per pencarian, tanpa menimpa ketikan.
 * Pencarian baru mengosongkan `alamatTerdeteksi`; saat itu penanda direset
 * supaya alamat yang sama di kunjungan berikutnya tetap terisi.
 */
function useIsiAlamatOtomatis(alamatTerdeteksi: string, alamat: string, ubah: FormKegiatan['ubah']) {
  const alamatTerakhir = useRef('');
  useEffect(() => {
    if (alamatTerdeteksi === '') {
      alamatTerakhir.current = '';
      return;
    }
    if (alamatTerdeteksi === alamatTerakhir.current) return;
    alamatTerakhir.current = alamatTerdeteksi;
    if (alamat === '') ubah({ alamat: alamatTerdeteksi });
  }, [alamatTerdeteksi, alamat, ubah]);
}

interface AksiMulaiLayar {
  reset: FormKegiatan['reset'];
  setNamaProspek: (nama: string | null) => void;
  cariLokasi: () => void;
}

/**
 * Setiap kali layar difokuskan, form di-reset (Tabs mempertahankan instance
 * layar) dan GPS dicari ulang. Semua aksi harus stabil antar-render; bila
 * tidak, efek fokus berjalan ulang dan menghapus isian.
 */
function useMulaiSaatFokus(param: ParamCatatKegiatan, aksi: AksiMulaiLayar) {
  const { reset, setNamaProspek, cariLokasi } = aksi;
  const { prospekId, prospekNama } = param;
  useFocusEffect(useCallback(() => {
    reset({ prospekId: teksParamAtauNull(prospekId) });
    setNamaProspek(teksParamAtauNull(prospekNama));
    cariLokasi();
  }, [reset, setNamaProspek, cariLokasi, prospekId, prospekNama]));
}

/** Logika layar catat kegiatan: form, GPS, tautan prospek, dan simpan sekali. */
export function useLayarCatatKegiatan(param: ParamCatatKegiatan, onSelesai: () => void) {
  const form = useFormKegiatan();
  const lokasi = useLokasiKegiatan();
  const prospek = useProspekTertaut(form.ubah);
  const pengirim = usePengirimKegiatan(form, lokasi.titik, onSelesai);

  useMulaiSaatFokus(param, { reset: form.reset, setNamaProspek: prospek.setNama, cariLokasi: lokasi.cari });
  useIsiAlamatOtomatis(lokasi.alamatTerdeteksi, form.nilai.alamat, form.ubah);

  return {
    form,
    lokasi,
    namaProspek: prospek.nama,
    pilihProspek: prospek.pilih,
    lepasProspek: prospek.lepas,
    ...pengirim,
  };
}
