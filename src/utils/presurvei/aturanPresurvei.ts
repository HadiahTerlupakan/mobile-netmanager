import {
  KEGIATAN_JENIS,
  type KegiatanHasil,
  type KegiatanJenis,
  type ProspekStatus,
} from '@/constants/presurvei';

/**
 * Aturan presurvei yang disalin dari netmanager sebagai fungsi murni:
 * `domain/prospek-rules.ts` (transisi), `domain/prospek-kanban.ts` (aksi),
 * `domain/kegiatan-rules.ts` (jenis/hasil). Hanya untuk UX — server tetap
 * penentu dan menolak transisi tak sah dengan 409.
 */

const TRANSISI_SAH: Record<ProspekStatus, readonly ProspekStatus[]> = {
  BARU: ['DIHUBUNGI', 'TIDAK_MINAT'],
  DIHUBUNGI: ['TERTARIK', 'TIDAK_MINAT', 'TIDAK_LAYAK'],
  TERTARIK: ['NEGOSIASI', 'TIDAK_MINAT', 'TIDAK_LAYAK'],
  NEGOSIASI: ['DEAL', 'TIDAK_MINAT', 'TIDAK_LAYAK'],
  DEAL: [],
  TIDAK_MINAT: ['DIHUBUNGI'],
  TIDAK_LAYAK: [],
};

const STATUS_DEAL: ProspekStatus = 'DEAL';
const JENIS_DI_LAPANGAN: readonly KegiatanJenis[] = ['KUNJUNGAN', 'SURVEI_LOKASI'];
const JENIS_BERDATA_TEKNIS: readonly KegiatanJenis[] = ['SURVEI_LOKASI'];
const JENIS_TIDAK_DICATAT_DARI_HP: readonly KegiatanJenis[] = ['IKLAN'];
const HASIL_BERMINAT: readonly KegiatanHasil[] = ['TERTARIK', 'DEAL'];

/** Status yang boleh dituju dari `status`. Selalu salinan baru. */
export function getStatusLanjutan(status: ProspekStatus): ProspekStatus[] {
  return [...TRANSISI_SAH[status]];
}

/** Apakah perpindahan status diizinkan aturan funnel. */
export function isTransisiStatusSah(dari: ProspekStatus, ke: ProspekStatus): boolean {
  return TRANSISI_SAH[dari].includes(ke);
}

/** Aksi saat sales memilih status tujuan. */
export type AksiUbahStatus =
  | { jenis: 'ubah-status'; tujuan: ProspekStatus }
  | { jenis: 'buka-konversi' };

/**
 * Aksi untuk perpindahan `dari` → `ke`, atau null bila tidak sah.
 * Deal membuka form konversi karena menuntut data yang tidak ada di prospek.
 *
 * Padanan backend: `resolveAksiKanban` (`modules/presurvei/domain/prospek-kanban.ts:26`,
 * diekspor lewat `modules/presurvei/client.ts:41`). Nama di sini beda karena
 * dipakai layar non-kanban di mobile (Task 15); perilaku sama.
 */
export function resolveAksiProspek(dari: ProspekStatus, ke: ProspekStatus): AksiUbahStatus | null {
  if (dari === ke) return null;
  if (!isTransisiStatusSah(dari, ke)) return null;
  return ke === STATUS_DEAL ? { jenis: 'buka-konversi' } : { jenis: 'ubah-status', tujuan: ke };
}

/** Satu pilihan di lembar Ubah Status. */
export interface PilihanUbahStatus {
  tujuan: ProspekStatus;
  aksi: AksiUbahStatus;
}

/** Pilihan Ubah Status yang sah dari `dari`, dalam urutan tabel transisi. */
export function daftarPilihanUbahStatus(dari: ProspekStatus): PilihanUbahStatus[] {
  return getStatusLanjutan(dari).flatMap((tujuan) => {
    const aksi = resolveAksiProspek(dari, tujuan);
    return aksi ? [{ tujuan, aksi }] : [];
  });
}

/** Apakah jenis kegiatan terjadi di lokasi sehingga wajib GPS dan foto. */
export function isButuhLokasi(jenis: KegiatanJenis): boolean {
  return JENIS_DI_LAPANGAN.includes(jenis);
}

/** Apakah jenis kegiatan boleh membawa data teknis survei. */
export function isButuhDataTeknis(jenis: KegiatanJenis): boolean {
  return JENIS_BERDATA_TEKNIS.includes(jenis);
}

/** Apakah hasil kegiatan menunjukkan minat yang layak jadi prospek. */
export function isHasilMelahirkanProspek(hasil: KegiatanHasil): boolean {
  return HASIL_BERMINAT.includes(hasil);
}

/** Jenis yang ditawarkan di aplikasi; Iklan adalah pekerjaan marketing kantor. */
export function daftarJenisDitawarkan(): KegiatanJenis[] {
  return KEGIATAN_JENIS.filter((jenis) => !JENIS_TIDAK_DICATAT_DARI_HP.includes(jenis));
}

/**
 * Apakah form boleh menawarkan "Buat prospek baru".
 * Sama dengan syarat server (netmanager `KegiatanService.ts:252-256`); di luar
 * syarat itu server membuang `prospekBaru` diam-diam.
 */
export function isBolehProspekBaru(kegiatan: {
  jenis: KegiatanJenis | null;
  hasil: KegiatanHasil | null;
  prospekId: string | null;
}): boolean {
  if (kegiatan.prospekId !== null) return false;
  if (kegiatan.jenis === null || kegiatan.hasil === null) return false;
  return isButuhLokasi(kegiatan.jenis) && isHasilMelahirkanProspek(kegiatan.hasil);
}

/** Apakah prospek boleh dijadikan canvasing (netmanager `prospek-rules.ts:97-105`). */
export function isBolehJadikanCanvasing(prospek: {
  status: ProspekStatus;
  canvasingId: string | null;
}): boolean {
  return prospek.status === STATUS_DEAL && (prospek.canvasingId ?? null) === null;
}
