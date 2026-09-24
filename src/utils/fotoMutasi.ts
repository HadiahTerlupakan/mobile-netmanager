/**
 * Logika foto `meta` mutasi `useApiMutation`: unggah di jalur online dan
 * salinan tetap sebelum masuk antrean offline.
 */

import {
  AWALAN_GALAT_STATUS_UNGGAH,
  NAMA_GALAT_UNGGAH_HABIS_WAKTU,
  PESAN_RESPONS_UNGGAH_TIDAK_SAH,
  uploadService,
  UploadType,
} from '@/services/UploadService';
import { isBerkasLokalAda, persistPhotoForOffline } from '@/utils/persistPhoto';

/** Tipe unggah bila `meta.photoType` tidak diisi; sama dengan `SyncService.ts:322`. */
const TIPE_UNGGAH_BAWAAN = 'general';

/**
 * Batas ulang unggah `meta.photos` di jalur online. Tiap percobaan
 * `UploadService` bisa makan 60 detik (`UploadService.ts:27,105`) ditambah
 * jeda 1+2 detik (`:230-233`); dengan bawaan 2 ulang (`:143`) sinyal lemah
 * baru ketahuan setelah ±183 detik. Tanpa ulang, habis waktu ketahuan dalam
 * ≤60 detik (≤30 detik bila macet, `:28,106-110`) lalu mutasi diantre; ulangan
 * berikutnya dikerjakan antrean (`SyncService.ts:241,274`) dari salinan tetap.
 */
const MAKS_ULANG_UNGGAH_FOTO_META = 0;

/** Pesan untuk pengguna bila berkas foto lokal hilang sebelum sempat terunggah. */
export const PESAN_FOTO_LOKAL_HILANG =
  'Foto bukti tidak ditemukan di perangkat. Ambil ulang fotonya lalu kirim lagi.';

/** Pengunggah satu berkas; mengembalikan URL server. */
export type PengunggahFoto = (uri: string, tipe: string) => Promise<string>;

/** Bagian `MutationMeta` yang dibaca di sini. */
export interface MetaFotoMutasi {
  photos?: string[];
  photoType?: string;
  targetField?: string;
  singleFile?: boolean;
  photoMap?: Record<string, string>;
}

/** Unggah satu foto `meta.photos` tanpa ulang di dalam `UploadService`. */
export const unggahFotoTanpaUlang: PengunggahFoto = (uri, tipe) =>
  uploadService.uploadFile(uri, tipe as UploadType, { maxRetries: MAKS_ULANG_UNGGAH_FOTO_META });

const isSudahDiunggah = (uri: string): boolean => uri.startsWith('http');

// `||`, bukan `??`: string kosong bukan tipe unggah yang sah.
const tentukanTipeUnggah = (meta: MetaFotoMutasi): string => meta.photoType || TIPE_UNGGAH_BAWAAN;

/**
 * Unggah `meta.photoMap` lokal dan isi `payload[medan]` dengan URL-nya.
 * Entri kosong atau yang sudah URL dilewati; medannya tidak disentuh.
 */
export async function unggahPetaFoto(
  meta: MetaFotoMutasi | undefined,
  payload: Record<string, unknown>,
  unggah: PengunggahFoto,
): Promise<void> {
  if (!meta?.photoMap) return;
  const tipe = tentukanTipeUnggah(meta);
  const unggahan = Object.entries(meta.photoMap).map(async ([medan, uri]) => {
    if (!uri || isSudahDiunggah(uri)) return;
    payload[medan] = await unggah(uri, tipe);
  });
  await Promise.all(unggahan);
}

/**
 * Unggah `meta.photos` lokal lalu isi `payload[meta.targetField]` dengan URL
 * dalam urutan yang sama: array, atau URL pertama bila `singleFile`. Bentuk
 * hasilnya sama dengan pengisian di jalur antrean (`SyncService.ts:317-343`).
 * Tanpa `targetField` atau tanpa foto, payload tidak disentuh: pemanggil lama
 * mengirim `photos: []` bersama nilai medan yang sudah ada
 * (`work-order-detail/[id].tsx:296-300`). Payload baru diubah setelah semua
 * unggahan berhasil, jadi kegagalan tidak meninggalkan medan setengah terisi.
 * Mengembalikan semua URL (urutan `photos`), atau `null` bila tak ada yang diproses.
 */
export async function unggahFotoMeta(
  meta: MetaFotoMutasi | undefined,
  payload: Record<string, unknown>,
  unggah: PengunggahFoto,
): Promise<string[] | null> {
  if (!meta?.targetField || !Array.isArray(meta.photos) || meta.photos.length === 0) return null;
  const tipe = tentukanTipeUnggah(meta);
  const urls = await Promise.all(
    meta.photos.map((uri) => (isSudahDiunggah(uri) ? uri : unggah(uri, tipe))),
  );
  payload[meta.targetField] = meta.singleFile ? (urls[0] ?? null) : urls;
  return urls;
}

async function salinPetaFoto(petaFoto: Record<string, unknown>): Promise<Record<string, string>> {
  const salinan: Record<string, string> = {};
  for (const [medan, uri] of Object.entries(petaFoto)) {
    if (uri && typeof uri === 'string') {
      salinan[medan] = await persistPhotoForOffline(uri);
    }
  }
  return salinan;
}

/**
 * Kembalikan salinan meta antrean dengan `photoMap` dan `photos` yang sudah
 * disalin ke penyimpanan tetap: URI kamera/manipulator ada di cache yang bisa
 * dibersihkan OS sebelum antrean terkirim (`persistPhoto.ts:1-7`). Entri
 * `photoMap` yang kosong dibuang; panjang `photos` dipertahankan. Bila
 * `urlTerunggah` diisi (semua foto sudah terunggah, POST yang gagal), URL itu
 * menjadi `photos`: SyncService hanya mengunggah URI `file://`
 * (`SyncService.ts:321`), jadi tidak ada unggah ulang.
 */
export async function salinFotoMetaUntukAntrean(
  meta: Record<string, unknown>,
  urlTerunggah: readonly string[] | null = null,
): Promise<Record<string, unknown>> {
  const salinan: Record<string, unknown> = { ...meta };
  if (meta.photoMap && typeof meta.photoMap === 'object') {
    salinan.photoMap = await salinPetaFoto(meta.photoMap as Record<string, unknown>);
  }
  if (urlTerunggah) {
    salinan.photos = [...urlTerunggah];
  } else if (Array.isArray(meta.photos)) {
    salinan.photos = await Promise.all(
      (meta.photos as string[]).map((uri) => persistPhotoForOffline(uri)),
    );
  }
  return salinan;
}

/**
 * Apakah galat unggah lahir dari jawaban server (`UploadService.ts`): status
 * non-2xx, 2xx tanpa `url`, atau badan yang bukan JSON (`SyntaxError` dari
 * `JSON.parse`). Selain itu (dan selain habis waktu) galatnya galat transport.
 */
export function isGalatResponsServer(error: unknown): boolean {
  if (error instanceof SyntaxError) return true;
  if (!(error instanceof Error)) return false;
  return error.message.startsWith(AWALAN_GALAT_STATUS_UNGGAH) || error.message === PESAN_RESPONS_UNGGAH_TIDAK_SAH;
}

/** Mengapa mutasi masuk antrean: perangkat offline, atau server tidak/terlambat menjawab. */
export type AlasanAntre = 'offline' | 'server-belum-merespons';

/**
 * Alasan galat unggah layak diantre, atau `null` bila tidak layak. Habis
 * waktu dan galat transport (server tidak menjawab) → `server-belum-merespons`;
 * galat respons server saat NetInfo offline → `offline`. Galat respons server
 * selagi online hanya akan ditolak lagi saat sinkron, jadi tidak diantre.
 */
export async function tentukanAlasanAntreUnggah(
  error: unknown,
  // `null` = keterjangkauan internet belum diketahui (NetInfo); diperlakukan offline.
  cekOnline: () => Promise<boolean | null>,
): Promise<AlasanAntre | null> {
  if (isUnggahHabisWaktu(error) || !isGalatResponsServer(error)) return 'server-belum-merespons';
  return (await cekOnline()) ? null : 'offline';
}

/** Apakah ada foto lokal `meta.photos` yang berkasnya sudah tidak ada. */
export async function adaFotoLokalHilang(meta: MetaFotoMutasi | undefined): Promise<boolean> {
  const lokal = (meta?.photos ?? []).filter((uri) => !isSudahDiunggah(uri));
  const hasil = await Promise.all(lokal.map((uri) => isBerkasLokalAda(uri)));
  return hasil.some((isAda) => !isAda);
}

/** Apakah galat unggah adalah habis waktu `UploadService` (sinyal lemah). */
export function isUnggahHabisWaktu(error: unknown): boolean {
  return error instanceof Error && error.name === NAMA_GALAT_UNGGAH_HABIS_WAKTU;
}
