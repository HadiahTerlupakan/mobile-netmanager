import { getHttpStatus, getServerErrorMessage, isClientRejection } from '@/lib/queryErrorReporting';
import type { TagihanPelanggan } from '@/types/portalPelanggan';
import { ambilMuatan } from '@/utils/responsPelanggan';
import api from './api';

const URL_TAGIHAN = '/api/customer/invoices';
/** OUTSTANDING_INVOICE_STATUSES server, sama dengan filter portal. */
const STATUS_TAGIHAN_TERBUKA = 'SENT,OVERDUE,PARTIAL_PAID';
/** Semua tagihan terbuka termuat dalam satu halaman; tunggakan 50 bulan tidak ada. */
const BATAS_TAGIHAN_TERBUKA = 50;
/** Cukup untuk menemukan tagihan yang baru dilunasi checkout yang sedang dipantau. */
const BATAS_TAGIHAN_TERBARU = 10;
const URL_VERIFIKASI_KUPON = '/api/customer/coupons/verify';
const PESAN_KUPON_TIDAK_SAH = 'Kupon tidak valid';
/** Ditangani interceptor API (sesi habis, paksa update), bukan penolakan kupon. */
const STATUS_BUKAN_PENOLAKAN_KUPON = new Set([401, 426]);

/** Diskon kupon yang sah untuk total tagihan saat diverifikasi. */
export interface DiskonKupon {
  code: string;
  amount: number;
}

/** Kupon sah beserta diskonnya, atau ditolak server beserta alasannya. */
export type HasilVerifikasiKupon = { isSah: true; diskon: DiskonKupon } | { isSah: false; pesan: string };

interface MuatanKupon {
  valid?: boolean;
  code?: string;
  discountAmount?: number;
}

function bacaHasilKupon(body: { data?: MuatanKupon; error?: string } | undefined): HasilVerifikasiKupon {
  const muatan = body?.data;
  if (!muatan?.valid || !muatan.code) return { isSah: false, pesan: body?.error ?? PESAN_KUPON_TIDAK_SAH };
  return { isSah: true, diskon: { code: muatan.code, amount: muatan.discountAmount ?? 0 } };
}

function isPenolakanKupon(error: unknown): boolean {
  return isClientRejection(error) && !STATUS_BUKAN_PENOLAKAN_KUPON.has(getHttpStatus(error) ?? 0);
}

async function ambilDaftarTagihan(query: string): Promise<TagihanPelanggan[]> {
  const response = await api.get(`${URL_TAGIHAN}?${query}`);
  return ambilMuatan<TagihanPelanggan[]>(response.data, 'invoices') ?? [];
}

/** Endpoint tagihan & pembayaran portal pelanggan (sesi CUSTOMER). */
export const TagihanPelangganService = {
  /**
   * Semua tagihan yang masih harus dibayar. Tanpa filter status, tagihan lama
   * yang belum dibayar bisa tertinggal di luar halaman pertama riwayat.
   */
  tagihanTerbuka(): Promise<TagihanPelanggan[]> {
    return ambilDaftarTagihan(`status=${STATUS_TAGIHAN_TERBUKA}&limit=${BATAS_TAGIHAN_TERBUKA}`);
  },

  /** Tagihan terbaru semua status, untuk membaca tagihan yang baru lunas atau dibatalkan. */
  tagihanTerbaru(): Promise<TagihanPelanggan[]> {
    return ambilDaftarTagihan(`limit=${BATAS_TAGIHAN_TERBARU}`);
  },

  /**
   * Verifikasi kupon untuk total tagihan. Rute staf `/api/coupons/verify`
   * selalu 401 untuk token pelanggan, yang oleh interceptor dianggap sesi habis.
   */
  async verifikasiKupon(kode: string, nominal: number): Promise<HasilVerifikasiKupon> {
    try {
      const response = await api.post(URL_VERIFIKASI_KUPON, { code: kode, amount: nominal });
      return bacaHasilKupon(response.data);
    } catch (error) {
      if (!isPenolakanKupon(error)) throw error;
      return { isSah: false, pesan: getServerErrorMessage(error) ?? PESAN_KUPON_TIDAK_SAH };
    }
  },
};
