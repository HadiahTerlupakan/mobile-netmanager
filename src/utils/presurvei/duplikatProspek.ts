import { PROSPEK_STATUSES, type ProspekStatus } from '@/constants/presurvei';
import type { DuplikatProspek } from '@/types/presurvei';
import { isGalatDuplikat } from '@/utils/galatIdempotensi';

/**
 * Penanganan 409 `DUPLIKAT` dari `POST /api/presurvei/prospek`. Bentuk balasan
 * (dicek langsung ke server):
 * `{ success:false, code:"DUPLIKAT", details:{ duplikat:[{id,nama,status,pemilikId}] } }`.
 */

const isTeks = (nilai: unknown): nilai is string => typeof nilai === 'string';

const isStatusProspek = (nilai: unknown): nilai is ProspekStatus =>
  isTeks(nilai) && (PROSPEK_STATUSES as readonly string[]).includes(nilai);

function keDuplikat(baris: unknown): DuplikatProspek | null {
  if (typeof baris !== 'object' || baris === null) return null;
  const { id, nama, status, pemilikId } = baris as Record<string, unknown>;
  if (!isTeks(id) || !isTeks(nama) || !isStatusProspek(status)) return null;
  return { id, nama, status, pemilikId: isTeks(pemilikId) ? pemilikId : null };
}

/**
 * Prospek yang bentrok nomor HP dari galat 409 `DUPLIKAT`, atau null bila
 * galat lain. Baris yang bentuknya tak dikenal dibuang; daftar kosong tetap
 * dikembalikan supaya pemanggil tahu ini memang galat duplikat.
 */
export function ambilDuplikatProspek(error: unknown): DuplikatProspek[] | null {
  if (!isGalatDuplikat(error)) return null;
  const data = (error as { response?: { data?: { details?: { duplikat?: unknown } } } }).response?.data;
  const daftar = data?.details?.duplikat;
  if (!Array.isArray(daftar)) return [];
  return daftar.map(keDuplikat).filter((baris): baris is DuplikatProspek => baris !== null);
}

/** Duplikat yang ditawarkan ke sales beserta apakah ia boleh memakainya. */
export interface TawaranDuplikat {
  prospek: DuplikatProspek | null;
  /** Hanya prospek milik sendiri yang bisa dibuka/dipakai sales. */
  isBolehDipakai: boolean;
}

/**
 * Pilih duplikat yang ditawarkan: utamakan milik pengguna sendiri (bisa
 * langsung dipakai), selain itu yang pertama (hanya diberitahukan).
 */
export function pilihTawaranDuplikat(daftar: readonly DuplikatProspek[], penggunaId: string | null): TawaranDuplikat {
  const milikSendiri = penggunaId === null ? undefined : daftar.find((baris) => baris.pemilikId === penggunaId);
  if (milikSendiri) return { prospek: milikSendiri, isBolehDipakai: true };
  return { prospek: daftar[0] ?? null, isBolehDipakai: false };
}

/** Kalimat pemberitahuan nomor ganda dalam bahasa sederhana. */
export function teksPemberitahuanDuplikat(tawaran: TawaranDuplikat): string {
  if (tawaran.prospek === null) return 'Nomor HP ini sudah tercatat sebelumnya.';
  const kalimat = `Nomor HP ini sudah tercatat atas nama ${tawaran.prospek.nama}.`;
  return tawaran.isBolehDipakai ? kalimat : `${kalimat} Data itu dipegang sales lain.`;
}
