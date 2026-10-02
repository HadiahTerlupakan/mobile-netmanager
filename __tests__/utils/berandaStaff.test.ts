import { keTanggalKalender } from '@/utils/date';
import { describe, expect, it } from '@jest/globals';

import {
  gabungPengajuan,
  jumlahMenunggu,
  labelAksiAbsen,
  liburBerikutnya,
  liburHariIni,
  statusPengajuan,
} from '@/utils/berandaStaff';

const LIBUR = [
  { name: 'Maulid Nabi', date: '2026-08-25T00:00:00.000Z', isNational: true },
  { name: 'Natal', date: '2026-12-25T00:00:00.000Z', isNational: true },
  { name: 'Cuti bersama', date: '2026-10-02T00:00:00.000Z', isNational: false },
  { name: 'Hari Guru', date: '2026-11-25T00:00:00.000Z', isNational: false },
];
const SEKARANG = new Date(2026, 9, 2, 9, 0); // 2 Okt 2026 09.00 waktu perangkat

describe('libur', () => {
  it('tanggal lokal berformat YYYY-MM-DD', () => {
    expect(keTanggalKalender(SEKARANG)).toBe('2026-10-02');
  });

  it('mengenali libur hari ini', () => {
    expect(liburHariIni(LIBUR, SEKARANG)?.name).toBe('Cuti bersama');
    expect(liburHariIni(LIBUR, new Date(2026, 9, 3))).toBeNull();
  });

  it('libur berikutnya = terdekat sesudah hari ini, beserta sisa hari', () => {
    expect(liburBerikutnya(LIBUR, SEKARANG)).toEqual({ libur: LIBUR[3], sisaHari: 54 });
    expect(liburBerikutnya(LIBUR, new Date(2026, 11, 26))).toBeNull();
  });
});

describe('pengajuan', () => {
  const izin = [
    { id: 'i1', type: 'CUTI', startDate: '2026-10-10T00:00:00Z', endDate: '2026-10-12T00:00:00Z', status: 'PENDING', createdAt: '2026-10-01T02:00:00Z' },
    { id: 'i2', type: 'SAKIT', startDate: '2026-09-20T00:00:00Z', endDate: '2026-09-20T00:00:00Z', status: 'APPROVED', createdAt: '2026-09-20T01:00:00Z' },
  ];
  const lembur = [
    { id: 'l1', status: 'REJECTED', createdAt: '2026-09-28T10:00:00Z' },
    { id: 'l2', status: 'PENDING', createdAt: '2026-10-01T09:00:00Z' },
  ];

  it('menggabung izin & lembur terbaru dulu, maksimal tiga', () => {
    const baris = gabungPengajuan(izin, lembur);
    expect(baris.map((b) => b.id)).toEqual(['l2', 'i1', 'l1']);
    expect(baris[1]).toMatchObject({ judul: 'Cuti', tanggalSelesai: '2026-10-12T00:00:00Z', status: { label: 'Menunggu' } });
    expect(baris[2].status).toEqual({ label: 'Ditolak', nada: 'gagal' });
  });

  it('izin satu hari tidak punya tanggal selesai', () => {
    expect(gabungPengajuan(izin, [], 5)[1]).toMatchObject({ judul: 'Sakit', tanggalSelesai: null });
  });

  it('menghitung yang masih menunggu', () => {
    expect(jumlahMenunggu(izin, lembur)).toBe(2);
  });

  it('status tak dikenal tampil apa adanya', () => {
    expect(statusPengajuan('DIBATALKAN')).toEqual({ label: 'DIBATALKAN', nada: 'netral' });
  });
});

describe('labelAksiAbsen', () => {
  it('mengikuti status absen', () => {
    expect(labelAksiAbsen('idle')).toBe('Check-in sekarang');
    expect(labelAksiAbsen(undefined)).toBe('Check-in sekarang');
    expect(labelAksiAbsen('checked-in')).toBe('Check-out sekarang');
    expect(labelAksiAbsen('checked-out')).toBe('Lihat absensi');
  });
});
