import { describe, expect, it } from '@jest/globals';

import type { BarisRekapRencana, Rencana } from '@/types/presurvei';
import {
  anggotaPerluPerhatian,
  anggotaTanpaRencana,
  hitungTerlewatPerAnggota,
  kelompokkanAgendaTim,
  labelAnggotaTim,
  persenSelesai,
  petaProgresRekap,
  ringkasTimHariIni,
  saringAnggotaTim,
  hurufAwalNama,
  ringkasanAgenda,
  filterMilikSendiri,
  filterTampilanRencana,
  gabungRekapTimHariIni,
  hakAksesRencana,
  isPemberiTugas,
  pesanSuksesTugaskan,
  rentangTerlewatTim,
} from '@/utils/presurvei/timRencana';

import { buatRencanaUji } from '../../fixtures/presurvei/rencana';
import { ANGGOTA_TIM_BESAR, namaAnggota } from '../../fixtures/presurvei/timBesar';

const SALES = { isPemberiTugas: false, penggunaId: 's-1' };
const KEPALA = { isPemberiTugas: true, penggunaId: 'k-1' };

const barisRekap = (salesId: string, over: Partial<BarisRekapRencana> = {}): BarisRekapRencana => ({
  salesId,
  namaSales: salesId,
  total: 0,
  selesai: 0,
  tepatWaktu: 0,
  terlambat: 0,
  terlewat: 0,
  batal: 0,
  mendatang: 0,
  persenRealisasi: null,
  ...over,
});

describe('isPemberiTugas', () => {
  it('TIM dan SEMUA pemberi tugas; SENDIRI dan profil lama tanpa medan bukan', () => {
    expect(isPemberiTugas('TIM')).toBe(true);
    expect(isPemberiTugas('SEMUA')).toBe(true);
    expect(isPemberiTugas('SENDIRI')).toBe(false);
    expect(isPemberiTugas(undefined)).toBe(false);
    expect(isPemberiTugas(null)).toBe(false);
  });
});

describe('filter rencana per tampilan', () => {
  it('sales biasa: filter tidak diubah (objek yang sama, query key tetap)', () => {
    const filter = { status: 'TERLEWAT' as const };
    expect(filterMilikSendiri(filter, SALES)).toBe(filter);
    expect(filterTampilanRencana(filter, 'tim', SALES, 's-9')).toBe(filter);
  });

  it('pemberi tugas "saya": salesId dirinya; tanpa id sesi filter apa adanya', () => {
    expect(filterMilikSendiri({ dari: 'a' }, KEPALA)).toEqual({ dari: 'a', salesId: 'k-1' });
    expect(filterTampilanRencana({ dari: 'a' }, 'saya', KEPALA, 's-2')).toEqual({ dari: 'a', salesId: 'k-1' });
    expect(filterMilikSendiri({ dari: 'a' }, { isPemberiTugas: true, penggunaId: null })).toEqual({ dari: 'a' });
  });

  it('pemberi tugas "tim": semua anggota, atau satu anggota terpilih', () => {
    expect(filterTampilanRencana({ dari: 'a' }, 'tim', KEPALA, null)).toEqual({ dari: 'a' });
    expect(filterTampilanRencana({ dari: 'a' }, 'tim', KEPALA, 's-2')).toEqual({ dari: 'a', salesId: 's-2' });
  });
});

describe('hakAksesRencana', () => {
  const rencana = (over: Partial<Parameters<typeof hakAksesRencana>[0]> = {}) => ({
    salesId: 's-2',
    sumber: 'PENUGASAN' as const,
    status: 'DIRENCANAKAN' as const,
    statusTampil: 'DIRENCANAKAN' as const,
    ...over,
  });

  it('sales biasa: laporkan rencana terbuka, atur hanya MANDIRI', () => {
    expect(hakAksesRencana(rencana({ salesId: 's-1' }), SALES)).toEqual({ isBolehLaporkan: true, isBolehAtur: false });
    expect(hakAksesRencana(rencana({ salesId: 's-1', sumber: 'MANDIRI' }), SALES)).toEqual({
      isBolehLaporkan: true,
      isBolehAtur: true,
    });
  });

  it('pemberi tugas: atur semua rencana terbuka (termasuk terlewat), laporkan hanya miliknya', () => {
    expect(hakAksesRencana(rencana(), KEPALA)).toEqual({ isBolehLaporkan: false, isBolehAtur: true });
    expect(hakAksesRencana(rencana({ statusTampil: 'TERLEWAT' }), KEPALA)).toEqual({
      isBolehLaporkan: false,
      isBolehAtur: true,
    });
    expect(hakAksesRencana(rencana({ salesId: 'k-1', sumber: 'MANDIRI' }), KEPALA)).toEqual({
      isBolehLaporkan: true,
      isBolehAtur: true,
    });
  });

  it('rencana tertutup: tidak ada aksi untuk siapa pun', () => {
    const selesai = rencana({ status: 'SELESAI', statusTampil: 'SELESAI' });
    expect(hakAksesRencana(selesai, KEPALA)).toEqual({ isBolehLaporkan: false, isBolehAtur: false });
    expect(hakAksesRencana({ ...selesai, salesId: 's-1' }, SALES)).toEqual({ isBolehLaporkan: false, isBolehAtur: false });
  });
});

describe('rekap Tim hari ini', () => {
  it('rentang terlewat 91 hari ke belakang sampai hari ini (batas rekap server 92 hari)', () => {
    expect(rentangTerlewatTim(new Date(2026, 8, 26, 15, 0))).toEqual({ dari: '2026-06-27', sampai: '2026-09-26' });
  });

  it('gabung total/selesai hari ini (tanpa batal) dengan terlewat lampau; urut nama', () => {
    const hariIni = [
      barisRekap('s-2', { namaSales: 'Sinta', total: 4, selesai: 1, batal: 1 }),
      barisRekap('s-3', { namaSales: 'Anton', total: 1, batal: 1 }),
      barisRekap('s-4', { namaSales: null, total: 2, selesai: 2 }),
    ];
    const lampau = [
      barisRekap('s-2', { namaSales: 'Sinta', total: 9, terlewat: 2 }),
      barisRekap('s-5', { namaSales: 'Budi', total: 3, terlewat: 1 }),
      barisRekap('s-6', { namaSales: 'Citra', total: 5, terlewat: 0 }),
    ];

    expect(gabungRekapTimHariIni(hariIni, lampau)).toEqual([
      { salesId: 's-5', namaSales: 'Budi', total: 0, selesai: 0, terlewat: 1 },
      { salesId: 's-4', namaSales: 'Sales', total: 2, selesai: 2, terlewat: 0 },
      { salesId: 's-2', namaSales: 'Sinta', total: 3, selesai: 1, terlewat: 2 },
    ]);
  });
});

describe('pesanSuksesTugaskan', () => {
  const daftar = [{ id: 'k-1', nama: 'Kepala Andi' }, { id: 's-2', nama: 'Sinta' }];

  it('menyebut nama sales yang ditugasi; menugaskan diri sendiri sama dengan Buat Rencana', () => {
    expect(pesanSuksesTugaskan('s-2', daftar, 'k-1')).toBe('Penugasan terkirim ke Sinta');
    expect(pesanSuksesTugaskan('k-1', daftar, 'k-1')).toBe('Rencana dibuat');
    expect(pesanSuksesTugaskan('s-9', daftar, 'k-1')).toBe('Penugasan terkirim ke Sales');
  });
});

describe('tampilan agenda', () => {
  it('inisial nama untuk avatar; nama kosong → ?', () => {
    expect(hurufAwalNama(' ani wijaya')).toBe('A');
    expect(hurufAwalNama(null)).toBe('?');
    expect(hurufAwalNama('  ')).toBe('?');
  });

  it('ringkasan agenda menghitung yang selesai; daftar kosong → null', () => {
    expect(ringkasanAgenda([{ statusTampil: 'SELESAI' }, { statusTampil: 'DIRENCANAKAN' }, { statusTampil: 'SELESAI' }])).toBe(
      '3 rencana · 2 selesai',
    );
    expect(ringkasanAgenda([])).toBeNull();
  });
});

const rencanaAnggota = (id: string, salesId: string, over: Partial<Rencana> = {}): Rencana =>
  buatRencanaUji(id, { salesId, namaSales: namaAnggota(salesId), ...over });

describe('labelAnggotaTim & saringAnggotaTim', () => {
  it('diri sendiri ditandai (Saya)', () => {
    expect(labelAnggotaTim({ id: 'k-1', nama: 'Kepala Andi' }, 'k-1')).toBe('Kepala Andi (Saya)');
    expect(labelAnggotaTim({ id: 's-2', nama: 'Sinta' }, 'k-1')).toBe('Sinta');
  });

  it('cari nama tanpa beda huruf besar/kecil; kosong/spasi → semua', () => {
    expect(saringAnggotaTim(ANGGOTA_TIM_BESAR, '  ').map((s) => s.id)).toHaveLength(ANGGOTA_TIM_BESAR.length);
    expect(saringAnggotaTim(ANGGOTA_TIM_BESAR, 'DI').map((s) => s.nama)).toEqual(['Kepala Andi', 'Budi', 'Rudi']);
    expect(saringAnggotaTim(ANGGOTA_TIM_BESAR, 'zzz')).toEqual([]);
  });
});

describe('petaProgresRekap', () => {
  it('total dikurangi batal; anggota tanpa rencana aktif dilewati', () => {
    const peta = petaProgresRekap([
      barisRekap('s-2', { total: 4, selesai: 1, batal: 1 }),
      barisRekap('s-3', { total: 1, batal: 1 }),
    ]);
    expect(peta.get('s-2')).toEqual({ selesai: 1, total: 3 });
    expect(peta.has('s-3')).toBe(false);
  });
});

describe('hitungTerlewatPerAnggota', () => {
  it('jumlah per anggota, terbanyak dulu lalu nama', () => {
    const hasil = hitungTerlewatPerAnggota([
      rencanaAnggota('t-1', 's-3'),
      rencanaAnggota('t-2', 's-2'),
      rencanaAnggota('t-3', 's-5'),
      rencanaAnggota('t-4', 's-5'),
    ]);
    expect(hasil).toEqual([
      { salesId: 's-5', namaSales: 'Wati', jumlah: 2 },
      { salesId: 's-2', namaSales: 'Sinta', jumlah: 1 },
      { salesId: 's-3', namaSales: 'Tono', jumlah: 1 },
    ]);
  });
});

describe('kelompokkanAgendaTim', () => {
  const HARIAN = [
    rencanaAnggota('r-1', 's-2', { statusTampil: 'SELESAI' }),
    rencanaAnggota('r-2', 's-2'),
    rencanaAnggota('r-3', 's-3'),
    rencanaAnggota('r-4', 's-3'),
    rencanaAnggota('r-5', 's-3', { statusTampil: 'BATAL' }),
    rencanaAnggota('r-6', 's-4'),
    rencanaAnggota('r-7', 's-4'),
    rencanaAnggota('r-8', 's-6'),
    rencanaAnggota('r-9', 's-7'),
    rencanaAnggota('r-10', 's-7', { statusTampil: 'SELESAI' }),
  ];

  it('terlewat dulu, lalu rencana terbuka terbanyak, lalu nama', () => {
    const bagian = kelompokkanAgendaTim(HARIAN, [
      { salesId: 's-7', namaSales: 'Dewi', jumlah: 1 },
      { salesId: 's-6', namaSales: 'Rudi', jumlah: 3 },
    ]);
    // Dewi & Rudi punya terlewat (terbuka 1 vs 1 → nama); Budi & Tono 2 terbuka → nama; Sinta 1 terbuka.
    expect(bagian.map((item) => item.namaSales)).toEqual(['Dewi', 'Rudi', 'Budi', 'Tono', 'Sinta']);
  });

  it('per anggota: selesai/total tanpa batal, terbuka, terlewat, dan rencananya', () => {
    const bagian = kelompokkanAgendaTim(HARIAN, [{ salesId: 's-3', namaSales: 'Tono', jumlah: 2 }]);
    const tono = bagian.find((item) => item.salesId === 's-3');
    expect(tono).toMatchObject({ total: 2, selesai: 0, terbuka: 2, terlewat: 2 });
    expect(tono?.data.map((item) => item.id)).toEqual(['r-3', 'r-4', 'r-5']);
    expect(bagian.find((item) => item.salesId === 's-2')).toMatchObject({ total: 2, selesai: 1, terbuka: 1, terlewat: 0 });
  });

  it('agenda kosong → tanpa bagian', () => {
    expect(kelompokkanAgendaTim([], [])).toEqual([]);
  });
});

describe('anggotaTanpaRencana', () => {
  it('anggota tim tanpa rencana hari itu (batal pun dihitung punya), urut nama', () => {
    const hasil = anggotaTanpaRencana(ANGGOTA_TIM_BESAR, [
      rencanaAnggota('r-1', 's-2'),
      rencanaAnggota('r-2', 'k-1', { statusTampil: 'BATAL' }),
      rencanaAnggota('r-3', 's-9'),
    ]);
    expect(hasil.map((sales) => sales.nama)).toEqual(['Budi', 'Dewi', 'Eka', 'Rudi', 'Tono', 'Wati']);
  });
});

describe('ringkasan tim Beranda', () => {
  const baris = (salesId: string, total: number, selesai: number, terlewat: number) => ({
    salesId,
    namaSales: namaAnggota(salesId),
    total,
    selesai,
    terlewat,
  });
  const TIM = [
    baris('s-2', 3, 3, 0),
    baris('s-3', 4, 1, 0),
    baris('s-4', 2, 0, 1),
    baris('s-5', 1, 1, 0),
    baris('s-6', 2, 0, 0),
    baris('s-7', 3, 2, 4),
    baris('s-8', 1, 0, 0),
    baris('s-9', 0, 0, 1),
  ];

  it('persenSelesai dibulatkan; total 0 → 0', () => {
    expect(persenSelesai(1, 3)).toBe(33);
    expect(persenSelesai(0, 0)).toBe(0);
  });

  it('jumlah selesai/total/terlewat seluruh tim beserta persen', () => {
    expect(ringkasTimHariIni(TIM)).toEqual({ selesai: 7, total: 16, persen: 44, terlewat: 6 });
    expect(ringkasTimHariIni([])).toEqual({ selesai: 0, total: 0, persen: 0, terlewat: 0 });
  });

  it('4 anggota paling perlu perhatian: terlewat, lalu belum selesai, lalu nama', () => {
    // Dewi (4 terlewat), lalu terlewat 1: Budi (2 belum) sebelum Fajar (0 belum), lalu Tono (3 belum).
    expect(anggotaPerluPerhatian(TIM).map((item) => item.namaSales)).toEqual(['Dewi', 'Budi', 'Fajar']);
    expect(anggotaPerluPerhatian(TIM, 2)).toHaveLength(2);
  });
});
