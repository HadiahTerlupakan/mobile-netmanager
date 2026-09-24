import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ENDPOINT_KEGIATAN_PRESURVEI } from '@/constants/presurvei';
import type { MuatanCatatKegiatan, ProspekListItem } from '@/types/presurvei';
import { presentAppError, presentInfoMessage } from '@/utils/errorPresenter';
import { isGalatIdempotensiKunciDipakaiUlang } from '@/utils/galatIdempotensi';
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

/** Pesan saat simpan ulang ditolak karena upaya sebelumnya ternyata sudah tercatat. */
const PESAN_SUDAH_TERCATAT = 'Kegiatan ini sudah tercatat sebelumnya.';

/** Upaya simpan yang gagal di server, disimpan agar simpan ulang memakai kunci yang sama. */
interface UpayaGagal {
  sidik: string;
  variabel: VariabelCatatKegiatan;
}

/** Satu upaya simpan beserta cara mencatat hasilnya ke ingatan niat. */
interface UpayaSimpan {
  variabel: VariabelCatatKegiatan;
  isPakaiUlang: boolean;
  ingatGagal: () => void;
  /** Masih milik form yang sedang tampil (layar belum difokuskan ulang sejak upaya dimulai). */
  isMasihBerlaku: () => boolean;
}

/**
 * Sidik niat simpan: hanya yang diisi sales, ditambah foto. `waktuMulai`
 * (baru tiap tekan), titik GPS (bisa disegarkan), dan alamat hasil isi
 * otomatis (reverse geocode bisa tiba setelah simpan pertama gagal) sengaja
 * dikeluarkan. Perubahan pada bagian-bagian itu bukan niat baru, sehingga
 * variabel lama, termasuk titik lamanya, tetap dipakai ulang. Alamat yang
 * diketik sales tetap ikut sidik.
 */
function sidikNiat(muatan: MuatanCatatKegiatan, fotoLokal: readonly string[], isAlamatOtomatis: boolean): string {
  const { waktuMulai: _waktu, latitude: _lat, longitude: _lng, alamatDikunjungi, ...isi } = muatan;
  const alamatKetikan = isAlamatOtomatis ? null : (alamatDikunjungi ?? null);
  return JSON.stringify({ isi, alamatKetikan, fotoLokal });
}

/**
 * Satu niat simpan = satu `requestId`. Bila simpan gagal di server lalu
 * ditekan ulang tanpa isian berubah (menurut `sidikNiat`), variabel lama
 * (requestId dan `waktuMulai` yang sama) dipakai ulang: galat seperti 504
 * dari gateway dilempar walau server mungkin sudah mencatat
 * (`useApiMutation.ts:304-308`), dan kunci yang sama membuat server
 * men-dedupe. Isian yang berubah adalah niat baru, sehingga
 * `bangunVariabelCatat` dipanggil lagi. `lupakan` menutup niat setelah
 * sukses; `mulaiNiatBaru` dipanggil setiap kali layar difokuskan (kegiatan
 * baru) dan menaikkan generasi, sehingga hasil upaya generasi lama yang tiba
 * terlambat tidak menyentuh form baru (review akhir M4).
 */
function useVariabelPerNiat() {
  const upayaGagal = useRef<UpayaGagal | null>(null);
  const generasi = useRef(0);
  const lupakan = useCallback(() => {
    upayaGagal.current = null;
  }, []);
  const mulaiNiatBaru = useCallback(() => {
    upayaGagal.current = null;
    generasi.current += 1;
  }, []);
  const siapkan = (
    muatan: MuatanCatatKegiatan,
    fotoLokal: readonly string[],
    isAlamatOtomatis: boolean,
  ): UpayaSimpan => {
    const sidik = sidikNiat(muatan, fotoLokal, isAlamatOtomatis);
    const lama = upayaGagal.current;
    const isPakaiUlang = lama !== null && lama.sidik === sidik;
    const variabel = isPakaiUlang ? lama.variabel : bangunVariabelCatat(muatan, fotoLokal);
    const ingatGagal = () => {
      upayaGagal.current = { sidik, variabel };
    };
    const generasiUpaya = generasi.current;
    const isMasihBerlaku = () => generasiUpaya === generasi.current;
    return { variabel, isPakaiUlang, ingatGagal, isMasihBerlaku };
  };
  return { siapkan, lupakan, mulaiNiatBaru };
}

type NiatSimpan = ReturnType<typeof useVariabelPerNiat>;

/**
 * Galat simpan. 409 `IDEMPOTENCY_KEY_REUSED` pada variabel yang dipakai ulang
 * berarti upaya sebelumnya sudah tercatat di server (lalu foto yang diunggah
 * ulang mengubah badan), jadi niat itu selesai dan layar ditutup; ingatan
 * niat dilupakan saat layar difokuskan lagi. Pada upaya pertama kasus itu
 * tidak semestinya terjadi; ia tampil sebagai galat biasa dan tidak diingat,
 * sehingga simpan berikutnya memakai kunci baru. Galat lain diingat untuk
 * simpan ulang (`useCatatKegiatan` yang menampilkan pesannya).
 */
function tanganiGalatSimpan(galat: unknown, upaya: UpayaSimpan, onSelesai: () => void) {
  if (!isGalatIdempotensiKunciDipakaiUlang(galat)) {
    upaya.ingatGagal();
    return;
  }
  if (!upaya.isPakaiUlang) {
    presentAppError(galat, { source: 'mutation', route: ENDPOINT_KEGIATAN_PRESURVEI, report: false });
    return;
  }
  presentInfoMessage(PESAN_SUDAH_TERCATAT);
  onSelesai();
}

interface OpsiPengirimKegiatan {
  form: FormKegiatan;
  titik: TitikGps | null;
  niat: NiatSimpan;
  isAlamatOtomatis: (alamat: string) => boolean;
  onSelesai: () => void;
}

/**
 * Kirim sekali: ref menahan tekan beruntun sebelum `isPending` sempat
 * dirender ulang, dan dilepas di `onSettled` apa pun hasilnya. Galat tidak
 * mengosongkan form; layar hanya ditutup lewat `onSelesai` setelah sukses
 * (terkirim atau masuk antrean) atau setelah dipastikan sudah tercatat.
 * Hasil upaya yang tiba setelah layar difokuskan ulang (mis. unggah lambat,
 * sales kembali lalu membuka Catat lagi) diabaikan: tidak menutup form baru
 * dan tidak diingat sebagai niatnya.
 */
function usePengirimKegiatan({ form, titik, niat, isAlamatOtomatis, onSelesai }: OpsiPengirimKegiatan) {
  const upayaBerjalan = useRef<UpayaSimpan | null>(null);
  const catat = useCatatKegiatan(() => {
    if (upayaBerjalan.current?.isMasihBerlaku() === true) onSelesai();
  });
  const isMengirim = useRef(false);
  const simpan = () => {
    if (isMengirim.current || !form.periksa(titik)) return;
    isMengirim.current = true;
    const muatan = keMuatanKegiatan(form.nilai, { titik, waktuMulai: new Date() });
    const upaya = niat.siapkan(muatan, form.fotoLokal, isAlamatOtomatis(form.nilai.alamat));
    upayaBerjalan.current = upaya;
    catat.mutate(upaya.variabel, {
      // Tanpa penjaga generasi: upaya baru baru bisa dimulai setelah upaya ini
      // selesai (`isMengirim`), jadi saat ini tidak ada ingatan niat baru.
      onSuccess: niat.lupakan,
      onError: (galat) => {
        if (upaya.isMasihBerlaku()) tanganiGalatSimpan(galat, upaya, onSelesai);
      },
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
 *
 * Mengembalikan `isAlamatOtomatis(alamat)`: benar bila alamat kosong atau
 * persis sama dengan nilai yang terakhir diisikan otomatis. Begitu sales
 * mengetik, nilainya berbeda dan dianggap isian sales.
 */
function useIsiAlamatOtomatis(alamatTerdeteksi: string, alamat: string, ubah: FormKegiatan['ubah']) {
  const alamatTerakhir = useRef('');
  const alamatTerisiOtomatis = useRef('');
  useEffect(() => {
    if (alamatTerdeteksi === '') {
      alamatTerakhir.current = '';
      return;
    }
    if (alamatTerdeteksi === alamatTerakhir.current) return;
    alamatTerakhir.current = alamatTerdeteksi;
    if (alamat !== '') return;
    alamatTerisiOtomatis.current = alamatTerdeteksi;
    ubah({ alamat: alamatTerdeteksi });
  }, [alamatTerdeteksi, alamat, ubah]);
  return (isian: string) => isian.trim() === '' || isian === alamatTerisiOtomatis.current;
}

interface AksiMulaiLayar {
  reset: FormKegiatan['reset'];
  setNamaProspek: (nama: string | null) => void;
  cariLokasi: () => void;
  mulaiNiatBaru: () => void;
}

/**
 * Setiap kali layar difokuskan, niat simpan lama dilupakan, form di-reset
 * (Tabs mempertahankan instance layar), dan GPS dicari ulang. Semua aksi harus
 * stabil antar-render; bila tidak, efek fokus berjalan ulang dan menghapus
 * isian. Tidak berjalan sebelum guard fitur mengizinkan (`isAktif`), supaya
 * prompt izin lokasi tidak muncul untuk pengguna yang akan dialihkan.
 */
function useMulaiSaatFokus(param: ParamCatatKegiatan, aksi: AksiMulaiLayar, isAktif: boolean) {
  const { reset, setNamaProspek, cariLokasi, mulaiNiatBaru } = aksi;
  const { prospekId, prospekNama } = param;
  useFocusEffect(useCallback(() => {
    if (!isAktif) return;
    mulaiNiatBaru();
    reset({ prospekId: teksParamAtauNull(prospekId) });
    setNamaProspek(teksParamAtauNull(prospekNama));
    cariLokasi();
  }, [isAktif, mulaiNiatBaru, reset, setNamaProspek, cariLokasi, prospekId, prospekNama]));
}

/**
 * Logika layar catat kegiatan: form, GPS, tautan prospek, dan simpan sekali.
 * `isAktif` = hasil guard fitur; selama false tidak ada efek samping.
 */
export function useLayarCatatKegiatan(param: ParamCatatKegiatan, onSelesai: () => void, isAktif: boolean) {
  const form = useFormKegiatan();
  const lokasi = useLokasiKegiatan();
  const prospek = useProspekTertaut(form.ubah);
  const niat = useVariabelPerNiat();

  // Urutan penting: efek fokus (reset) harus terdaftar sebelum isi alamat
  // otomatis, supaya alamat yang sudah terdeteksi saat layar dibuka tidak
  // langsung terhapus oleh reset pada commit yang sama.
  useMulaiSaatFokus(
    param,
    { reset: form.reset, setNamaProspek: prospek.setNama, cariLokasi: lokasi.cari, mulaiNiatBaru: niat.mulaiNiatBaru },
    isAktif,
  );
  const isAlamatOtomatis = useIsiAlamatOtomatis(lokasi.alamatTerdeteksi, form.nilai.alamat, form.ubah);
  const pengirim = usePengirimKegiatan({ form, titik: lokasi.titik, niat, isAlamatOtomatis, onSelesai });

  return {
    form,
    lokasi,
    namaProspek: prospek.nama,
    pilihProspek: prospek.pilih,
    lepasProspek: prospek.lepas,
    ...pengirim,
  };
}
