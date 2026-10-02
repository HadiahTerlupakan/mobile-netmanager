import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRincianRencana, useSalesTersediaRencana } from '@/hooks/queries/usePresurveiRencana';
import { useIsOnline } from '@/hooks/useIsOnline';
import type { MuatanTugaskanRencana, Rencana, SalesRencana } from '@/types/presurvei';
import {
  keMuatanBuatRencana,
  keMuatanUbahRencana,
  nilaiFormDariRencana,
  nilaiFormRencanaBaru,
  PESAN_FORM_RENCANA,
} from '@/utils/presurvei/formRencana';
import { keTanggalKalender } from '@/utils/presurvei/rencana';
import { pesanSuksesTugaskan } from '@/utils/presurvei/timRencana';
import { useFormRencana, type FormRencana } from './useFormRencana';
import { useLingkupRencana } from './useLingkupRencana';
import { useBuatRencana, useUbahRencana } from './useMutasiRencana';

/** Yang dibutuhkan `LayarFormRencana` dari hook layar buat maupun ubah. */
export interface LayarFormRencana {
  form: FormRencana;
  hariIni: string;
  isOnline: boolean;
  isMenyimpan: boolean;
  simpan: () => void;
}

/**
 * Tanggal awal form: tanggal agenda yang sedang dilihat bila belum lewat,
 * selain itu hari ini (rencana tidak boleh bertanggal lampau).
 */
function tanggalAwalForm(tanggalDiminta: string | null, hariIni: string): string {
  return tanggalDiminta && tanggalDiminta >= hariIni ? tanggalDiminta : hariIni;
}

/** Kosongkan form menjadi rencana baru bertanggal `tanggalAwalForm` (dipanggil saat layar difokuskan). */
function resetKeRencanaBaru(reset: FormRencana['reset'], tanggalDiminta: string | null): void {
  const hariIniSaatFokus = keTanggalKalender(new Date());
  reset(nilaiFormRencanaBaru(tanggalAwalForm(tanggalDiminta, hariIniSaatFokus)), null);
}

/**
 * Logika layar Buat Rencana. Form di-reset setiap kali layar difokuskan
 * (Tabs mempertahankan instance layar). Online saja: selama offline tombol
 * simpan nonaktif dan layar menjelaskan alasannya.
 */
export function useLayarBuatRencana(isAktif: boolean, tanggalDiminta: string | null = null): LayarFormRencana {
  const router = useRouter();
  const hariIni = keTanggalKalender(new Date());
  const form = useFormRencana(nilaiFormRencanaBaru(hariIni));
  const isOnline = useIsOnline();
  const buat = useBuatRencana(() => router.back());
  const { reset } = form;

  useFocusEffect(useCallback(() => {
    if (!isAktif) return;
    resetKeRencanaBaru(reset, tanggalDiminta);
  }, [isAktif, reset, tanggalDiminta]));

  const simpan = () => {
    if (!isOnline || buat.isPending || !form.periksa(hariIni)) return;
    buat.mutate(keMuatanBuatRencana(form.nilai));
  };

  return { form, hariIni, isOnline, isMenyimpan: buat.isPending, simpan };
}

/** Pemilih sales di layar Tugaskan: daftar dari server, pilihan, dan kesalahannya. */
export interface PemilihSalesRencana {
  /** undefined selama memuat atau gagal tanpa cache. */
  daftar: SalesRencana[] | undefined;
  isGagal: boolean;
  cobaLagi: () => void;
  terpilih: string | null;
  penggunaId: string | null;
  kesalahan: string | undefined;
  pilih: (salesId: string) => void;
}

/** Logika layar Tugaskan: form rencana ditambah pemilih sales (wajib). */
export interface LayarTugaskanRencana extends LayarFormRencana {
  sales: PemilihSalesRencana;
}

/**
 * Logika layar Tugaskan (pemberi tugas). Sama dengan Buat Rencana, ditambah
 * sales wajib dipilih; `salesIdAwal` (dari filter tim) terpilih saat layar
 * difokuskan. Menugaskan diri sendiri sah dan menjadi rencana MANDIRI.
 */
export function useLayarTugaskanRencana(
  isAktif: boolean,
  salesIdAwal: string | null,
  tanggalDiminta: string | null = null,
): LayarTugaskanRencana {
  const router = useRouter();
  const hariIni = keTanggalKalender(new Date());
  const form = useFormRencana(nilaiFormRencanaBaru(hariIni));
  const isOnline = useIsOnline();
  const { penggunaId } = useLingkupRencana();
  const daftarSales = useSalesTersediaRencana(isAktif);
  const [salesId, setSalesId] = useState<string | null>(salesIdAwal);
  const [kesalahanSales, setKesalahanSales] = useState<string | undefined>(undefined);
  const buat = useBuatRencana<MuatanTugaskanRencana>(
    () => router.back(),
    (muatan) => pesanSuksesTugaskan(muatan.salesId, daftarSales.data ?? [], penggunaId),
  );
  const { reset } = form;

  useFocusEffect(useCallback(() => {
    if (!isAktif) return;
    resetKeRencanaBaru(reset, tanggalDiminta);
    setSalesId(salesIdAwal);
    setKesalahanSales(undefined);
  }, [isAktif, reset, salesIdAwal, tanggalDiminta]));

  const pilih = (id: string) => {
    setSalesId(id);
    setKesalahanSales(undefined);
  };

  const simpan = () => {
    const isFormSah = form.periksa(hariIni);
    setKesalahanSales(salesId === null ? PESAN_FORM_RENCANA.sales : undefined);
    if (!isOnline || buat.isPending || !isFormSah || salesId === null) return;
    buat.mutate({ ...keMuatanBuatRencana(form.nilai), salesId });
  };

  return {
    form,
    hariIni,
    isOnline,
    isMenyimpan: buat.isPending,
    simpan,
    sales: {
      daftar: daftarSales.data,
      isGagal: daftarSales.isError,
      cobaLagi: () => void daftarSales.refetch(),
      terpilih: salesId,
      penggunaId,
      kesalahan: kesalahanSales,
      pilih,
    },
  };
}

/**
 * Isi form dari rencana sekali per pembukaan layar: refetch di latar tidak
 * boleh menimpa isian yang sedang diketik, tetapi membuka layar lagi memuat
 * data terbaru.
 */
function useIsiDariRencana(rencana: Rencana | undefined, reset: FormRencana['reset']) {
  const idTerisi = useRef<string | null>(null);
  useFocusEffect(useCallback(() => {
    idTerisi.current = null;
  }, []));
  useEffect(() => {
    if (!rencana || idTerisi.current === rencana.id) return;
    idTerisi.current = rencana.id;
    reset(nilaiFormDariRencana(rencana), rencana.namaProspek);
  }, [rencana, reset]);
}

/** Logika layar Ubah Rencana: muat rincian, isi form, kirim hanya medan yang berubah. */
export function useLayarUbahRencana(id: string, isAktif: boolean) {
  const router = useRouter();
  const hariIni = keTanggalKalender(new Date());
  const rincian = useRincianRencana(id, isAktif);
  const form = useFormRencana(nilaiFormRencanaBaru(hariIni));
  const isOnline = useIsOnline();
  const ubah = useUbahRencana(id, () => router.back());
  useIsiDariRencana(rincian.data, form.reset);

  const simpan = () => {
    const rencana = rincian.data;
    if (!rencana || !isOnline || ubah.isPending || !form.periksa(hariIni, rencana.tanggal)) return;
    const muatan = keMuatanUbahRencana(rencana, form.nilai);
    if (Object.keys(muatan).length === 0) {
      router.back();
      return;
    }
    ubah.mutate(muatan);
  };

  return {
    rencana: rincian.data,
    isPending: rincian.isPending,
    refetch: rincian.refetch,
    form,
    hariIni,
    isOnline,
    isMenyimpan: ubah.isPending,
    simpan,
  };
}
