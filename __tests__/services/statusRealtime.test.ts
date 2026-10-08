import {
  dengarkanStatusRealtime,
  resetStatusRealtime,
  setStatusRealtime,
  statusRealtimeSaatIni,
} from '@/services/statusRealtime';

/**
 * Indikator "Live" pada layar Work Order dulu dihitung `!!token` — "sudah
 * login", bukan "realtime tersambung". Ketika langganan Firestore ditolak
 * berulang lalu menyerah, layar tetap hijau "Live" sementara tidak ada satu pun
 * pembaruan yang akan datang.
 *
 * Indikator yang tidak pernah merah lebih buruk daripada tidak ada indikator:
 * orang menunggu sesuatu yang tidak akan terjadi.
 */

beforeEach(() => resetStatusRealtime());

describe('status realtime', () => {
  it('dimulai dari "mencoba", bukan langsung mengaku terhubung', () => {
    expect(statusRealtimeSaatIni()).toBe('mencoba');
  });

  it('memberi tahu pendengar saat status berubah', () => {
    const terlihat: string[] = [];
    dengarkanStatusRealtime((s) => terlihat.push(s));

    setStatusRealtime('terhubung');
    setStatusRealtime('terputus');

    expect(terlihat).toEqual(['terhubung', 'terputus']);
  });

  // Snapshot Firestore datang berkali-kali; menyiarkan tiap kali memaksa render
  // ulang tanpa ada yang berubah di layar.
  it('status yang sama tidak disiarkan ulang', () => {
    const terlihat: string[] = [];
    dengarkanStatusRealtime((s) => terlihat.push(s));

    setStatusRealtime('terhubung');
    setStatusRealtime('terhubung');
    setStatusRealtime('terhubung');

    expect(terlihat).toEqual(['terhubung']);
  });

  it('pembatalan langganan menghentikan pemberitahuan', () => {
    const terlihat: string[] = [];
    const batal = dengarkanStatusRealtime((s) => terlihat.push(s));

    setStatusRealtime('terhubung');
    batal();
    setStatusRealtime('terputus');

    expect(terlihat).toEqual(['terhubung']);
    expect(statusRealtimeSaatIni()).toBe('terputus');
  });
});
