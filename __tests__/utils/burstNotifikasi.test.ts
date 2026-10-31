import { describe, expect, it } from '@jest/globals';

import { PenjagaBurstNotifikasi, susunToastRingkasan } from '@/utils/burstNotifikasi';

const BERBUNYI = { isBersuara: true, isBolehToast: true, isAwalBurst: true };
const SENYAP_IKUT_RINGKASAN = { isBersuara: false, isBolehToast: true, isAwalBurst: false };
const SENYAP_TANPA_TOAST = { isBersuara: false, isBolehToast: false };

describe('PenjagaBurstNotifikasi', () => {
  it('push pertama di luar masa tenang berbunyi', () => {
    const penjaga = new PenjagaBurstNotifikasi();

    expect(penjaga.putuskan(10_000)).toEqual(BERBUNYI);
  });

  it('push yang menyusul kurang dari 3 detik kemudian senyap, tetapi ikut toast ringkasan', () => {
    const penjaga = new PenjagaBurstNotifikasi();
    penjaga.putuskan(10_000);

    expect(penjaga.putuskan(12_999)).toEqual(SENYAP_IKUT_RINGKASAN);
  });

  it('burst diukur dari push sebelumnya: empat push berjarak 2 detik cukup satu bunyi', () => {
    const penjaga = new PenjagaBurstNotifikasi();

    const bunyi = [10_000, 12_000, 14_000, 16_000].map((waktu) => penjaga.putuskan(waktu).isBersuara);

    expect(bunyi).toEqual([true, false, false, false]);
  });

  it('push setelah jeda 3 detik memulai burst baru dan berbunyi lagi', () => {
    const penjaga = new PenjagaBurstNotifikasi();
    penjaga.putuskan(10_000);

    expect(penjaga.putuskan(13_000)).toEqual(BERBUNYI);
  });

  it('selama 5 detik masa tenang tidak ada bunyi dan tidak ada toast', () => {
    const penjaga = new PenjagaBurstNotifikasi();
    penjaga.mulaiMasaTenang(10_000);

    expect(penjaga.putuskan(10_100)).toEqual({ ...SENYAP_TANPA_TOAST, isAwalBurst: true });
    expect(penjaga.putuskan(14_999)).toEqual({ ...SENYAP_TANPA_TOAST, isAwalBurst: true });
    expect(penjaga.isMasaTenang(14_999)).toBe(true);
    expect(penjaga.isMasaTenang(15_000)).toBe(false);
  });

  it('tumpukan push yang dimulai dalam masa tenang tetap senyap walau berlanjut melewati 5 detik', () => {
    const penjaga = new PenjagaBurstNotifikasi();
    penjaga.mulaiMasaTenang(10_000);
    penjaga.putuskan(14_000);

    expect(penjaga.putuskan(16_000)).toEqual({ ...SENYAP_TANPA_TOAST, isAwalBurst: false });
  });

  it('push pertama setelah masa tenang dan tumpukannya reda berbunyi lagi', () => {
    const penjaga = new PenjagaBurstNotifikasi();
    penjaga.mulaiMasaTenang(10_000);
    penjaga.putuskan(14_000);

    expect(penjaga.putuskan(17_000)).toEqual(BERBUNYI);
  });
});

describe('susunToastRingkasan', () => {
  it('satu push tampil dengan judul dan isinya sendiri', () => {
    expect(susunToastRingkasan([{ title: 'Work Order Baru', body: 'WO-20260415-0002' }])).toEqual({
      judul: 'Work Order Baru',
      pesan: 'WO-20260415-0002',
    });
  });

  it('push tanpa judul dan isi memakai teks bawaan', () => {
    expect(susunToastRingkasan([{ title: null, body: null }])).toEqual({
      judul: 'Notifikasi Baru',
      pesan: 'Anda menerima notifikasi baru.',
    });
  });

  it('beberapa push diringkas menjadi satu toast yang menyebut jumlahnya', () => {
    const tiga = [
      { title: 'Work Order Baru', body: 'WO-1' },
      { title: 'Tagihan', body: 'Jatuh tempo' },
      { title: 'Surat Pengesahan', body: 'Menunggu tanda tangan' },
    ];

    expect(susunToastRingkasan(tiga)).toEqual({
      judul: '3 Notifikasi Baru',
      pesan: 'Lihat semuanya di panel notifikasi.',
    });
  });
});
