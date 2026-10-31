import { getHttpStatus, getServerErrorMessage, isClientRejection } from '@/lib/queryErrorReporting';
import type { MetodePembayaranPelanggan, TagihanPelanggan } from '@/types/portalPelanggan';
import { ambilMuatan } from '@/utils/responsPelanggan';
import type { StatusCekPembayaran } from '@/utils/tagihan/pesanStatusPembayaran';
import api from './api';

const URL_PEMBAYARAN = '/api/customer/payments';
const URL_METODE_BAYAR = '/api/customer/payment-methods';
const URL_CEK_STATUS = `${URL_PEMBAYARAN}/check-status`;
const STATUS_TIDAK_DITEMUKAN = 404;

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

/** Checkout untuk semua tagihan terbuka dengan satu metode. */
export interface PermintaanPembayaran {
  invoiceIds: string[];
  kodeKupon: string | null;
  kodeMetode: string;
}

/** Instruksi bayar checkout yang baru dibuat. */
export interface CheckoutBaru {
  paymentUrl: string | null;
  vaNumber: string | null;
  qrString: string | null;
}

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
   * Metode bayar untuk nominal yang akan dibayar: server menyaring channel
   * gateway yang aktif untuk nominal itu. Tanpa nominal: katalog lengkap.
   */
  async metodeBayar(nominal: number): Promise<MetodePembayaranPelanggan[]> {
    const response = await api.get(nominal > 0 ? `${URL_METODE_BAYAR}?amount=${nominal}` : URL_METODE_BAYAR);
    const daftar = response.data?.data;
    return Array.isArray(daftar) ? daftar : [];
  },

  /** Buat checkout, atau ganti checkout yang menunggu dengan metode lain. */
  async buatPembayaran({ invoiceIds, kodeKupon, kodeMetode }: PermintaanPembayaran): Promise<CheckoutBaru> {
    const response = await api.post(URL_PEMBAYARAN, {
      invoiceIds,
      couponCode: kodeKupon,
      paymentMethod: kodeMetode,
      notes: 'Payment via Mobile App',
    });
    return {
      paymentUrl: ambilMuatan<string>(response.data, 'paymentUrl') ?? null,
      vaNumber: ambilMuatan<string>(response.data, 'vaNumber') ?? null,
      qrString: ambilMuatan<string>(response.data, 'qrString') ?? null,
    };
  },

  /**
   * Tanyakan checkout gateway tagihan ini ke gateway; bila sudah dibayar,
   * server melunasinya lewat jalur yang sama dengan webhook. `null`: server
   * lama tanpa endpoint ini (404), pemanggil cukup memuat ulang tagihan.
   */
  async cekStatusPembayaran(invoiceId: string): Promise<StatusCekPembayaran | null> {
    try {
      const response = await api.post(URL_CEK_STATUS, { invoiceId });
      return ambilMuatan<StatusCekPembayaran>(response?.data, 'status') ?? null;
    } catch (error) {
      if (getHttpStatus(error) === STATUS_TIDAK_DITEMUKAN) return null;
      throw error;
    }
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
