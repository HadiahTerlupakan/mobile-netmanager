import type { KegiatanHasil, KegiatanJenis } from '@/constants/presurvei';
import type { KegiatanListItem } from '@/types/presurvei';
import type { KegiatanMenunggu } from './antreanKegiatan';
import { isDalamRentang, type RentangTanggalIso } from './rentangHari';

/** Satu baris daftar kegiatan, dari server maupun dari antrean offline. */
export interface BarisKegiatan {
  kunci: string;
  jenis: KegiatanJenis;
  hasil: KegiatanHasil;
  waktuMulai: string;
  tempat: string | null;
  ditemuiNama: string | null;
  jumlahFoto: number;
  /** Masih di antrean, akan dicoba dikirim lagi (PENDING/RETRY). */
  isMenunggu: boolean;
  /**
   * Sudah berhenti dicoba ulang tapi tetap di antrean (FAILED). Ruling
   * Task 14: kegiatan ini WAJIB tetap tampil, jangan hilang dari pandangan
   * sales — label "Gagal terkirim" dipisah dari "Menunggu kirim" karena
   * kegiatan ini tidak akan terkirim sendiri lagi.
   */
  isGagal: boolean;
}

/** Baris daftar dari item kegiatan server (sudah tersimpan, bukan menunggu). */
export function keBarisKegiatan(item: KegiatanListItem): BarisKegiatan {
  return {
    kunci: `server-${item.id}`,
    jenis: item.jenis,
    hasil: item.hasil,
    waktuMulai: item.waktuMulai,
    tempat: item.alamatDikunjungi,
    ditemuiNama: item.ditemuiNama,
    jumlahFoto: item.jumlahFoto,
    isMenunggu: false,
    isGagal: false,
  };
}

/** Baris daftar dari satu item antrean offline. */
function dariAntrean(kegiatan: KegiatanMenunggu): BarisKegiatan {
  const isGagal = kegiatan.status === 'FAILED';
  return {
    kunci: `antrean-${kegiatan.idAntrean}`,
    jenis: kegiatan.jenis,
    hasil: kegiatan.hasil,
    waktuMulai: kegiatan.waktuMulai,
    tempat: kegiatan.alamatDikunjungi,
    ditemuiNama: kegiatan.ditemuiNama,
    jumlahFoto: kegiatan.jumlahFoto,
    isMenunggu: !isGagal,
    isGagal,
  };
}

/** Kegiatan satu hari: server + antrean pada hari itu, terbaru lebih dulu. */
export function gabungKegiatanHarian(
  server: readonly KegiatanListItem[],
  antrean: readonly KegiatanMenunggu[],
  rentang: RentangTanggalIso,
): BarisKegiatan[] {
  const menunggu = antrean.filter((kegiatan) => isDalamRentang(kegiatan.waktuMulai, rentang)).map(dariAntrean);
  return [...menunggu, ...server.map(keBarisKegiatan)].sort(
    (a, b) => Date.parse(b.waktuMulai) - Date.parse(a.waktuMulai),
  );
}
