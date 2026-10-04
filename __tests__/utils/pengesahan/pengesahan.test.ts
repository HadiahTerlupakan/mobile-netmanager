import { describe, expect, it } from '@jest/globals';

import { DATA_URL_TANDA_TANGAN_MAKS } from '@/constants/pengesahan';
import type { DetailPengesahanSaya } from '@/types/pengesahan';
import {
  PESAN_TANDA_TANGAN_KOSONG,
  PESAN_TANDA_TANGAN_TERLALU_BESAR,
  periksaDataUrlTandaTangan,
  skemaTolakPengesahan,
} from '@/utils/pengesahan/formPengesahan';
import {
  hitungPersenKemajuan,
  labelKemajuanTandaTangan,
  pesanKeadaanSurat,
  tentukanMenuPengesahan,
} from '@/utils/pengesahan/tampilanPengesahan';

const SURAT: DetailPengesahanSaya = {
  id: 'd-1',
  number: 'SP/001',
  title: 'Surat tugas',
  status: 'SENT',
  mySignerStatus: 'VIEWED',
  canSign: true,
  signerCount: 2,
  signedCount: 1,
  expiresAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  description: null,
  sourceFileName: 'surat.pdf',
  hasSignedFile: false,
  cancelReason: null,
  signers: [],
};

describe('tentukanMenuPengesahan', () => {
  it('tersembunyi tanpa data atau tanpa surat', () => {
    expect(tentukanMenuPengesahan(undefined)).toEqual({ isTampil: false, jumlahLencana: 0 });
    expect(tentukanMenuPengesahan({ menungguCount: 0, totalCount: 0 })).toEqual({ isTampil: false, jumlahLencana: 0 });
  });

  it('tampil bila ada surat; lencana = surat menunggu tanda tangan saya', () => {
    expect(tentukanMenuPengesahan({ menungguCount: 3, totalCount: 7 })).toEqual({ isTampil: true, jumlahLencana: 3 });
    expect(tentukanMenuPengesahan({ menungguCount: 0, totalCount: 7 })).toEqual({ isTampil: true, jumlahLencana: 0 });
  });
});

describe('kemajuan tanda tangan', () => {
  it('teks & persen aman untuk surat tanpa penanda tangan', () => {
    expect(labelKemajuanTandaTangan(1, 3)).toBe('1 dari 3 sudah tanda tangan');
    expect(hitungPersenKemajuan(1, 4)).toBe(25);
    expect(hitungPersenKemajuan(0, 0)).toBe(0);
    expect(hitungPersenKemajuan(5, 4)).toBe(100);
  });
});

describe('pesanKeadaanSurat', () => {
  it('null bila saya bisa menandatangani sekarang', () => {
    expect(pesanKeadaanSurat(SURAT)).toBeNull();
  });

  it('menjelaskan keadaan surat yang tidak bisa ditandatangani', () => {
    expect(pesanKeadaanSurat({ ...SURAT, canSign: false })).toBe('Belum giliran Anda menandatangani.');
    expect(pesanKeadaanSurat({ ...SURAT, canSign: false, mySignerStatus: 'SIGNED' })).toBe('Anda sudah menandatangani surat ini.');
    expect(pesanKeadaanSurat({ ...SURAT, status: 'COMPLETED' })).toBe('Surat sah. Semua pihak sudah tanda tangan.');
    expect(pesanKeadaanSurat({ ...SURAT, status: 'CANCELLED', cancelReason: 'Salah data' })).toBe('Surat dibatalkan: Salah data');
    expect(pesanKeadaanSurat({ ...SURAT, status: 'EXPIRED' })).toBe('Surat sudah kedaluwarsa.');
  });
});

describe('periksaDataUrlTandaTangan', () => {
  it('menerima PNG data URL dalam batas server', () => {
    expect(periksaDataUrlTandaTangan('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
  });

  it('menolak kosong, bukan PNG, dan yang melebihi batas', () => {
    expect(periksaDataUrlTandaTangan('')).toBe(PESAN_TANDA_TANGAN_KOSONG);
    expect(periksaDataUrlTandaTangan('data:image/png;base64,')).toBe(PESAN_TANDA_TANGAN_KOSONG);
    expect(periksaDataUrlTandaTangan('data:image/jpeg;base64,abc')).toBe(PESAN_TANDA_TANGAN_KOSONG);
    const besar = `data:image/png;base64,${'A'.repeat(DATA_URL_TANDA_TANGAN_MAKS)}`;
    expect(periksaDataUrlTandaTangan(besar)).toBe(PESAN_TANDA_TANGAN_TERLALU_BESAR);
  });
});

describe('skemaTolakPengesahan', () => {
  it('alasan dipangkas dan wajib 3–500 karakter', () => {
    expect(skemaTolakPengesahan.safeParse({ alasan: '  ab ' }).success).toBe(false);
    expect(skemaTolakPengesahan.safeParse({ alasan: 'x'.repeat(501) }).success).toBe(false);
    expect(skemaTolakPengesahan.parse({ alasan: '  Data keliru  ' })).toEqual({ alasan: 'Data keliru' });
  });
});
