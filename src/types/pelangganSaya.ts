/** `GET /api/mobile/pelanggan/saya`: pelanggan yang dipegang sales (lingkup diputuskan server). */
export interface PelangganSaya {
  id: string;
  idPelanggan: string;
  nama: string;
  status: string;
  paket: string | null;
  alamat: string | null;
  noTelp: string | null;
  jatuhTempo: string;
  siteName: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Nama sales penanggung jawab (berguna bagi kepala/head of sales). */
  namaSales: string | null;
  /** WO terbuka terbaru, bila ada pekerjaan/gangguan yang sedang ditangani. */
  woTerbuka: { nomor: string; status: string; jenis: string } | null;
  jumlahKeluhanTerbuka: number;
}

export interface HalamanPelangganSaya {
  data: PelangganSaya[];
  total: number;
  page: number;
  limit: number;
}

export type StatusPelangganSaya = 'AKTIF' | 'ISOLIR' | 'NONAKTIF' | 'MAINTENANCE';
