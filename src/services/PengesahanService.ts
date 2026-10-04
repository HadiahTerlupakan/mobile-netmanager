import * as FileSystem from 'expo-file-system/legacy';

import type {
  DetailPengesahanSaya,
  HalamanPengesahan,
  HasilTandaTanganPengesahan,
  KelompokPengesahan,
  RingkasanPengesahan,
} from '@/types/pengesahan';
import api from './api';
import { RefreshTokenService } from './RefreshTokenService';
import { TenantService } from './TenantService';
import { TokenService } from './TokenService';

const URL_PENGESAHAN = '/api/mobile/pengesahan';
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
export const PESAN_DOKUMEN_GAGAL_DIUNDUH = 'Dokumen gagal diunduh. Periksa koneksi lalu coba lagi.';

/** Alamat absolut berkas PDF surat di server tenant. */
function susunUrlBerkas(id: string): string {
  const dasar = TenantService.getTenantUrl().replace(/\/+$/, '');
  return `${dasar}${URL_PENGESAHAN}/${encodeURIComponent(id)}/file`;
}

/** Unduh berkas dengan token tertentu; mengembalikan status HTTP. */
async function unduhDenganToken(id: string, tujuan: string, token: string | null): Promise<number> {
  const hasil = await FileSystem.downloadAsync(susunUrlBerkas(id), tujuan, {
    headers: { Authorization: `Bearer ${token ?? ''}`, Accept: 'application/pdf' },
  });
  return hasil.status;
}

/**
 * Unduhan berkas tidak lewat interceptor axios, jadi token kedaluwarsa tidak
 * disegarkan otomatis. Pada 401 token disegarkan sekali lalu unduhan diulang.
 */
async function unduhDenganSegarkanToken(id: string, tujuan: string): Promise<number> {
  const status = await unduhDenganToken(id, tujuan, TokenService.getToken());
  if (status !== HTTP_UNAUTHORIZED) return status;
  const tokenBaru = await RefreshTokenService.refreshAccessToken();
  return tokenBaru ? unduhDenganToken(id, tujuan, tokenBaru) : status;
}

/** Surat pengesahan (tanda tangan elektronik) yang ditujukan kepada pengguna. */
export const PengesahanService = {
  /** Jumlah surat menunggu tanda tangan saya dan total surat saya. */
  async ringkasan(): Promise<RingkasanPengesahan> {
    const response = await api.get<{ data: RingkasanPengesahan }>(`${URL_PENGESAHAN}/ringkasan`);
    return response.data.data;
  },

  /** Satu halaman surat menunggu / selesai. */
  async daftar(params: { status: KelompokPengesahan; page: number; limit: number }): Promise<HalamanPengesahan> {
    const response = await api.get<{ data: HalamanPengesahan }>(URL_PENGESAHAN, { params });
    return response.data.data;
  },

  /** Detail surat beserta penanda tangannya. */
  async detail(id: string): Promise<DetailPengesahanSaya> {
    const response = await api.get<{ data: DetailPengesahanSaya }>(`${URL_PENGESAHAN}/${id}`);
    return response.data.data;
  },

  /** Kirim tanda tangan saya (data URL PNG). */
  async tandaTangan(id: string, signatureDataUrl: string): Promise<HasilTandaTanganPengesahan> {
    const response = await api.post<{ data: HasilTandaTanganPengesahan }>(`${URL_PENGESAHAN}/${id}/sign`, { signatureDataUrl });
    return response.data.data;
  },

  /** Tolak menandatangani dengan alasan. */
  async tolak(id: string, reason: string): Promise<{ declined: true }> {
    const response = await api.post<{ data: { declined: true } }>(`${URL_PENGESAHAN}/${id}/decline`, { reason });
    return response.data.data;
  },

  /** Unduh PDF surat ke cache perangkat; mengembalikan URI berkas lokal. */
  async unduhDokumen(id: string): Promise<string> {
    const tujuan = `${FileSystem.cacheDirectory}pengesahan-${id}.pdf`;
    const status = await unduhDenganSegarkanToken(id, tujuan);
    if (status === HTTP_OK) return tujuan;
    await FileSystem.deleteAsync(tujuan, { idempotent: true });
    throw new Error(PESAN_DOKUMEN_GAGAL_DIUNDUH);
  },
};
