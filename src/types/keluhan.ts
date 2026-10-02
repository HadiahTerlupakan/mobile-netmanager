/** Kontrak `/api/mobile/keluhan`: keluhan pelanggan yang dicatat / dipantau sales. */

export type KelompokStatusKeluhan = 'TERBUKA' | 'SELESAI';
export type KategoriKeluhan = 'TECHNICAL' | 'BILLING' | 'ACCOUNT' | 'OTHER';
export type PrioritasKeluhan = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface WoKeluhanRingkas {
  nomor: string;
  status: string;
  namaTeknisi: string | null;
  jadwal: string | null;
}

export interface KeluhanRingkas {
  id: string;
  nomor: string;
  subjek: string;
  kategori: string;
  prioritas: string;
  status: string;
  dibuatPada: string;
  diperbaruiPada: string;
  pelanggan: { id: string; nama: string; idPelanggan: string };
  namaSales: string | null;
  /** Null = dicatat pelanggan sendiri lewat portal / admin. */
  namaPelapor: string | null;
  wo: WoKeluhanRingkas | null;
}

export interface RingkasanKeluhanSales {
  salesId: string | null;
  namaSales: string;
  jumlahTerbuka: number;
}

export interface HalamanKeluhan {
  data: KeluhanRingkas[];
  total: number;
  page: number;
  limit: number;
  /** Hanya untuk kepala / head of sales di halaman pertama. */
  ringkasanSales: RingkasanKeluhanSales[] | null;
}

export interface BalasanKeluhan {
  id: string;
  pesan: string;
  dariHelpdesk: boolean;
  namaPengirim: string | null;
  waktu: string;
  lampiran: string[];
}

export interface WoKeluhan {
  id: string;
  nomor: string;
  jenis: string;
  status: string;
  namaTeknisi: string | null;
  jadwal: string | null;
  jamJadwal: string | null;
  dimulaiPada: string | null;
  selesaiPada: string | null;
}

export interface DetailKeluhan extends Omit<KeluhanRingkas, 'pelanggan' | 'wo'> {
  deskripsi: string;
  selesaiPada: string | null;
  pelanggan: KeluhanRingkas['pelanggan'] & { noTelp: string | null; alamat: string | null };
  balasan: BalasanKeluhan[];
  workOrders: WoKeluhan[];
}

export interface MuatanLaporKeluhan {
  pelangganId: string;
  kategori: KategoriKeluhan;
  prioritas: PrioritasKeluhan;
  subjek: string;
  deskripsi: string;
}
