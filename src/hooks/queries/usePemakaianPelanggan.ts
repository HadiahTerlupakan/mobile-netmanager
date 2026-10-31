import { useQuery } from '@tanstack/react-query';

import api from '@/services/api';
import type { KoneksiPelanggan, PemakaianPelanggan } from '@/types/portalPelanggan';
import { ambilMuatan } from '@/utils/responsPelanggan';

/** Status koneksi dan pemakaian bulan ini; keduanya datang dalam satu respons. */
const ambilPemakaian = async () => {
  const res = await api.get('/api/customer/usage');
  return {
    connection: ambilMuatan<KoneksiPelanggan>(res.data, 'connection'),
    pemakaianBulanIni: ambilMuatan<PemakaianPelanggan>(res.data, 'usage')?.monthly,
  };
};

/** Sesi PPPoE (status, alamat IP, uptime) dan pemakaian bulan ini, untuk Koneksi dan Detail Layanan. */
export function usePemakaianPelanggan() {
  return useQuery({
    // Kunci lama ('customer-connection') menyimpan objek koneksi saja dan ikut
    // dipulihkan dari cache persisten; kunci baru mencegah bentuk lama terbaca.
    queryKey: ['customer-usage'],
    queryFn: ambilPemakaian,
  });
}
