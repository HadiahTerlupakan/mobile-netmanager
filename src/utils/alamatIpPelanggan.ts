import type { KoneksiPelanggan } from '@/types/portalPelanggan';

/** Jenis alamat IP pelanggan, sama dengan `IpAddressKind` portal web. */
export type JenisAlamatIp = 'Privat' | 'Publik';

const JUMLAH_OKTET_IPV4 = 4;
const OKTET_MAKS = 255;
const NILAI_PER_OKTET = 256;
const LABEL_TANPA_IP = '-';

/**
 * Rentang yang tidak bisa dijangkau dari internet: RFC 1918 dan CGNAT
 * (RFC 6598, 100.64.0.0/10) yang banyak dipakai pool PPPoE ISP.
 */
const RENTANG_IPV4_PRIVAT: readonly { awal: readonly [number, number]; prefix: number }[] = [
  { awal: [10, 0], prefix: 8 },
  { awal: [172, 16], prefix: 12 },
  { awal: [192, 168], prefix: 16 },
  { awal: [100, 64], prefix: 10 },
];

/** IPv4 sebagai bilangan 32-bit; null bila bukan IPv4 yang sah. */
function nilaiIpv4(ip: string): number | null {
  const oktet = ip.split('.');
  if (oktet.length !== JUMLAH_OKTET_IPV4) return null;
  if (oktet.some((bagian) => !/^\d{1,3}$/.test(bagian) || Number(bagian) > OKTET_MAKS)) return null;
  return oktet.reduce((nilai, bagian) => nilai * NILAI_PER_OKTET + Number(bagian), 0);
}

/**
 * Alamat sesi tanpa prefix: radacct.framedipaddress bertipe inet, jadi API
 * mengirim mis. "172.31.251.254/32".
 */
export function tanpaPrefix(ip: string): string {
  return ip.split('/')[0] ?? ip;
}

/** Golongkan IPv4 sebagai Privat (RFC 1918/CGNAT) atau Publik; null bila bukan IPv4. */
export function jenisAlamatIp(ip: string): JenisAlamatIp | null {
  const nilai = nilaiIpv4(tanpaPrefix(ip));
  if (nilai === null) return null;
  const isPrivat = RENTANG_IPV4_PRIVAT.some(({ awal, prefix }) => {
    const nilaiAwal = awal[0] * 2 ** 24 + awal[1] * 2 ** 16;
    return nilai >= nilaiAwal && nilai < nilaiAwal + 2 ** (32 - prefix);
  });
  return isPrivat ? 'Privat' : 'Publik';
}

/**
 * Baris "Jenis IP Address" di Detail Layanan, mis. "10.127.63.254 (Privat)".
 * Seperti portal, alamat dibaca dari sesi PPPoE yang sedang online; statis
 * atau dinamis tidak disebut karena API tidak mengekspos Framed-IP radreply.
 */
export function labelAlamatIp(koneksi: Pick<KoneksiPelanggan, 'isOnline' | 'ipAddress'> | null | undefined): string {
  if (!koneksi?.isOnline || !koneksi.ipAddress) return LABEL_TANPA_IP;
  const jenis = jenisAlamatIp(koneksi.ipAddress);
  return jenis ? `${tanpaPrefix(koneksi.ipAddress)} (${jenis})` : LABEL_TANPA_IP;
}
