import { TIPE_UNGGAH_FOTO_KEGIATAN } from '@/constants/presurvei';
import type { ApiMutationVariables } from '@/hooks/queries/useApiMutation';
import type { MuatanCatatKegiatan } from '@/types/presurvei';
import { createRequestId } from '@/utils/requestId';
import { isButuhLokasi } from './aturanPresurvei';

/** Medan badan yang diisi URL foto oleh `useApiMutation`/`SyncService` (K1). */
const MEDAN_FOTO_KEGIATAN = 'fotoUrls';

/** Awalan kunci idempotensi catat kegiatan (format `createRequestId`). */
const CAKUPAN_REQUEST_ID_KEGIATAN = 'presurvei';

/**
 * Variabel mutasi catat kegiatan: muatan + foto lokal di `meta`.
 *
 * `& ApiMutationVariables` (bukan hanya `{meta?: …}`) karena
 * `useApiMutation` menuntut `TVariables extends ApiMutationVariables`
 * (`useApiMutation.ts:221`), yang membawa index signature `[key: string]:
 * unknown`. Tanpanya `tsc` menolak dengan "Index signature for type
 * 'string' is missing" — dibuktikan lewat kompilasi, bukan diasumsikan.
 */
export type VariabelCatatKegiatan = MuatanCatatKegiatan &
  ApiMutationVariables & {
    requestId: string;
    meta?: { photos: string[]; targetField: string; photoType: string };
  };

/**
 * Bangun variabel mutasi untuk SATU upaya simpan; foto lokal disalin ke
 * `meta.photos`.
 *
 * `requestId` dibuat sekali di sini lalu ikut di badan: `useApiMutation`
 * membacanya dari payload (`useApiMutation.ts:251`) untuk header
 * `Idempotency-Key`, badan yang diantrekan membawanya, dan `SyncService`
 * membacanya lagi dari badan antrean saat replay (`SyncService.ts:315,394`).
 * Jadi POST yang timeout lalu diputar ulang memakai kunci yang sama, dan
 * server tidak mencatat kegiatan ganda. Server membuang medan ini dari badan
 * (`catatKegiatanSchema` tidak `.strict()`).
 *
 * `fotoUrls` (lewat `meta`) hanya disertakan untuk jenis yang butuh lokasi
 * (kunjungan/survei lokasi). Telepon dan Chat tidak membawa bukti foto di
 * form (spec §4.1); bila `fotoLokal` tetap terisi untuk jenis itu — mis. sisa
 * dari jenis lapangan yang diganti sebelum kirim — foto itu tidak boleh ikut
 * terkirim atau terantre.
 */
export function bangunVariabelCatat(
  muatan: MuatanCatatKegiatan,
  fotoLokal: readonly string[],
): VariabelCatatKegiatan {
  const requestId = createRequestId(CAKUPAN_REQUEST_ID_KEGIATAN);
  if (fotoLokal.length === 0 || !isButuhLokasi(muatan.jenis)) return { ...muatan, requestId };
  return {
    ...muatan,
    requestId,
    meta: { photos: [...fotoLokal], targetField: MEDAN_FOTO_KEGIATAN, photoType: TIPE_UNGGAH_FOTO_KEGIATAN },
  };
}

/** Badan request (termasuk `requestId`); `meta` tidak pernah dikirim ke server. */
export function badanCatatKegiatan(variabel: VariabelCatatKegiatan): Record<string, unknown> {
  const { meta: _meta, ...muatan } = variabel;
  return muatan;
}
