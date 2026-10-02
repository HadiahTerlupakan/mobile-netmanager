/** `GET /api/mobile/pelanggan/tunggakan`: pelanggan isolir per sales penanggung jawab. */
export interface PelangganTunggakan {
  id: string;
  idPelanggan: string;
  nama: string;
  username: string;
  paket: string | null;
  alamat: string | null;
  noTelp: string | null;
  jatuhTempo: string;
  hariLewat: number;
  siteName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface KelompokTunggakan {
  /** null = pelanggan belum punya sales penanggung jawab. */
  salesId: string | null;
  namaSales: string;
  pelanggan: PelangganTunggakan[];
}

export interface RingkasanTunggakan {
  total: number;
  kelompok: KelompokTunggakan[];
}
