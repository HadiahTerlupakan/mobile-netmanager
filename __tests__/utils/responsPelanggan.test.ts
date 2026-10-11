import { describe, expect, it } from '@jest/globals';

import { ambilMuatan } from '@/utils/responsPelanggan';

/**
 * Endpoint portal pelanggan membungkus muatan di `data` (`apiSuccess`), tetapi
 * ketiga pembaca invoice — Beranda, Tagihan, Riwayat — membacanya dari akar
 * sehingga selalu `undefined`. Akibatnya daftar tagihan selalu kosong dan
 * Beranda menyatakan "Tagihan Lunas / Rp 0" kepada pelanggan yang sebenarnya
 * menunggak. Terbukti di QA perangkat: tagihan Rp 150.000 berstatus SENT ada
 * di basis data dan dikembalikan API, tetapi aplikasi tetap menulis Rp 0.
 */
describe('ambilMuatan', () => {
  const INVOICE = [{ id: 'inv-1', totalAmount: 150000 }];

  it('membaca muatan yang dibungkus `data`', () => {
    expect(ambilMuatan({ success: true, data: { invoices: INVOICE } }, 'invoices')).toEqual(
      INVOICE,
    );
  });

  // Bentuk lama (tanpa pembungkus) tetap didukung supaya endpoint yang belum
  // diseragamkan tidak ikut rusak.
  it('tetap membaca muatan di akar', () => {
    expect(ambilMuatan({ invoices: INVOICE }, 'invoices')).toEqual(INVOICE);
  });

  it('mendahulukan muatan terbungkus bila keduanya ada', () => {
    expect(
      ambilMuatan({ invoices: [], data: { invoices: INVOICE } }, 'invoices'),
    ).toEqual(INVOICE);
  });

  it('mengembalikan undefined bila kuncinya tidak ada', () => {
    expect(ambilMuatan({ data: {} }, 'invoices')).toBeUndefined();
    expect(ambilMuatan(null, 'invoices')).toBeUndefined();
    expect(ambilMuatan('bukan objek', 'invoices')).toBeUndefined();
  });

  // Daftar kosong yang sah berbeda dari "tidak ada"; jangan sampai tertukar.
  it('membedakan daftar kosong dari ketiadaan', () => {
    expect(ambilMuatan({ data: { invoices: [] } }, 'invoices')).toEqual([]);
  });
});
