import {
  ENDPOINT_KEGIATAN_PRESURVEI,
  KEGIATAN_HASIL,
  KEGIATAN_JENIS,
  type KegiatanHasil,
  type KegiatanJenis,
} from '@/constants/presurvei';
import type { SyncQueueItem } from '@/services/DatabaseService';

/** Kegiatan yang tersimpan di antrean offline dan belum terkirim. */
export interface KegiatanMenunggu {
  idAntrean: number;
  jenis: KegiatanJenis;
  hasil: KegiatanHasil;
  waktuMulai: string;
  alamatDikunjungi: string | null;
  ditemuiNama: string | null;
  jumlahFoto: number;
}

const METODE_CATAT = 'POST';

type BadanAntrean = Record<string, unknown>;

function bacaJson(teks: string): BadanAntrean | null {
  try {
    const nilai: unknown = JSON.parse(teks);
    return nilai !== null && typeof nilai === 'object' ? (nilai as BadanAntrean) : null;
  } catch {
    return null;
  }
}

function teksAtauNull(nilai: unknown): string | null {
  return typeof nilai === 'string' && nilai.trim() !== '' ? nilai : null;
}

function isKegiatanDikenal(badan: BadanAntrean): boolean {
  return (
    (KEGIATAN_JENIS as readonly unknown[]).includes(badan.jenis) &&
    (KEGIATAN_HASIL as readonly unknown[]).includes(badan.hasil) &&
    typeof badan.waktuMulai === 'string'
  );
}

function jumlahFotoMeta(item: SyncQueueItem): number {
  const photos = bacaJson(item.meta)?.photos;
  return Array.isArray(photos) ? photos.length : 0;
}

function keKegiatanMenunggu(item: SyncQueueItem, badan: BadanAntrean): KegiatanMenunggu {
  return {
    idAntrean: item.id,
    jenis: badan.jenis as KegiatanJenis,
    hasil: badan.hasil as KegiatanHasil,
    waktuMulai: badan.waktuMulai as string,
    alamatDikunjungi: teksAtauNull(badan.alamatDikunjungi),
    ditemuiNama: teksAtauNull(badan.ditemuiNama),
    jumlahFoto: jumlahFotoMeta(item),
  };
}

/**
 * Kegiatan presurvei di antrean offline. Badan yang rusak atau jenis yang
 * tidak dikenal dilewati, bukan dilempar: antrean dipakai bersama modul lain.
 */
export function ambilKegiatanMenunggu(antrean: readonly SyncQueueItem[]): KegiatanMenunggu[] {
  return antrean
    .filter((item) => item.url === ENDPOINT_KEGIATAN_PRESURVEI && item.method === METODE_CATAT)
    .flatMap((item) => {
      const badan = bacaJson(item.body);
      return badan && isKegiatanDikenal(badan) ? [keKegiatanMenunggu(item, badan)] : [];
    });
}
