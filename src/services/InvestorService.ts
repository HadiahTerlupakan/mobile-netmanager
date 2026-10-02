import api from './api';
import {
  ENDPOINT_BAGI_HASIL_INVESTOR,
  ENDPOINT_PENCAIRAN_INVESTOR,
  ENDPOINT_PROYEK_INVESTOR,
  ENDPOINT_RINGKASAN_INVESTOR,
  ENDPOINT_SETORAN_INVESTOR,
  UKURAN_HALAMAN_PENCAIRAN,
} from '@/constants/investor';
import type {
  BagiHasilInvestor,
  HalamanPencairanInvestor,
  ProyekInvestor,
  RincianProyekInvestor,
  RingkasanInvestor,
  SetoranModalInvestor,
} from '@/types/investor';

async function ambilData<T>(url: string, params?: object): Promise<T> {
  const respons = await api.get(url, params ? { params } : undefined);
  return respons.data.data as T;
}

/** Akses data portal investor; semua dibatasi ke investor yang login oleh server. */
export const InvestorService = {
  /** Ringkasan Beranda: modal, saldo, bagi hasil menunggu, proyek. */
  ringkasan: () => ambilData<RingkasanInvestor>(ENDPOINT_RINGKASAN_INVESTOR),

  /** Daftar proyek tempat investor menanam modal. */
  daftarProyek: () => ambilData<ProyekInvestor[]>(ENDPOINT_PROYEK_INVESTOR),

  /** Rincian satu proyek. */
  rincianProyek: (id: string) =>
    ambilData<RincianProyekInvestor>(`${ENDPOINT_PROYEK_INVESTOR}/${encodeURIComponent(id)}`),

  /** Riwayat setoran modal. */
  setoranModal: () => ambilData<SetoranModalInvestor[]>(ENDPOINT_SETORAN_INVESTOR),

  /** Riwayat bagi hasil per periode. */
  bagiHasil: () => ambilData<BagiHasilInvestor[]>(ENDPOINT_BAGI_HASIL_INVESTOR),

  /** Satu halaman riwayat uang yang sudah dikirim ke investor. */
  pencairan: (page: number) =>
    ambilData<HalamanPencairanInvestor>(ENDPOINT_PENCAIRAN_INVESTOR, {
      page,
      limit: UKURAN_HALAMAN_PENCAIRAN,
    }),
};
