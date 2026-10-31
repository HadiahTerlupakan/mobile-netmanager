import { getHttpStatus, getServerErrorMessage, isClientRejection } from '@/lib/queryErrorReporting';
import api from './api';

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

/** Endpoint tagihan & pembayaran portal pelanggan (sesi CUSTOMER). */
export const TagihanPelangganService = {
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
