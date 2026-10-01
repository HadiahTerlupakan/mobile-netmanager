import type { Href } from 'expo-router';

import type { ProspekListItem, Rencana } from '@/types/presurvei';
import type { TabPenilaian } from '@/utils/presurvei/tampilanPenilaian';

/** Layar catat kegiatan (`app/(app)/presurvei/kegiatan/catat.tsx`). */
export const RUTE_CATAT_KEGIATAN = '/(app)/presurvei/kegiatan/catat';

/** Layar Tambah Prospek (`app/(app)/presurvei/prospek/baru.tsx`). */
export const RUTE_TAMBAH_PROSPEK = '/(app)/presurvei/prospek/baru';

/** Rincian satu prospek. */
export function ruteRincianProspek(id: string): Href {
  return { pathname: '/(app)/presurvei/prospek/[id]', params: { id } } as Href;
}

/** Form catat kegiatan dengan prospek terpilih ("Catat Follow-up"). */
export function ruteCatatFollowUp(prospek: Pick<ProspekListItem, 'id' | 'nama'>): Href {
  return {
    pathname: RUTE_CATAT_KEGIATAN,
    params: { prospekId: prospek.id, prospekNama: prospek.nama },
  } as Href;
}

/** Form Jadikan Canvasing untuk satu prospek. */
export function ruteJadikanCanvasing(id: string): Href {
  return { pathname: '/(app)/presurvei/prospek/[id]/jadikan-canvasing', params: { id } } as Href;
}

/** Layar penilaian kinerja (sales: dirinya; kepala sales: dirinya + tim). */
export const RUTE_PENILAIAN_KINERJA = '/(app)/presurvei/penilaian';

/**
 * Layar penilaian langsung di satu tab (mis. "Kepala sales" dari kartu
 * Beranda lingkup SEMUA). `diminta` membedakan tiap ketukan supaya layar yang
 * instansinya dipertahankan tetap menerapkan permintaan yang sama.
 */
export function rutePenilaianTab(tab: TabPenilaian, diminta: number): Href {
  return { pathname: RUTE_PENILAIAN_KINERJA, params: { tab, diminta: String(diminta) } } as Href;
}

/** Layar buat rencana kunjungan. */
export const RUTE_BUAT_RENCANA = '/(app)/presurvei/rencana/buat';

/** Buat rencana dengan tanggal awal = tanggal agenda yang sedang dilihat. */
export function ruteBuatRencana(tanggal: string): Href {
  return { pathname: RUTE_BUAT_RENCANA, params: { tanggal } } as Href;
}

/** Rincian satu rencana kunjungan (juga tujuan deep-link notifikasi penugasan). */
export function ruteRincianRencana(id: string): Href {
  return { pathname: '/(app)/presurvei/rencana/[id]', params: { id } } as Href;
}

/** Form ubah rencana (MANDIRI milik sendiri, atau rencana tim bagi pemberi tugas). */
export function ruteUbahRencana(id: string): Href {
  return { pathname: '/(app)/presurvei/rencana/[id]/ubah', params: { id } } as Href;
}

/**
 * Form catat kegiatan sebagai laporan sebuah rencana: jenis dan prospek
 * rencana terisi, dan `rencanaId` ikut terkirim sehingga server menutup
 * rencananya. Param kosong tidak disertakan (route param selalu teks).
 */
export function ruteLaporkanRencana(rencana: Pick<Rencana, 'id' | 'jenis' | 'prospekId' | 'namaProspek'>): Href {
  return {
    pathname: RUTE_CATAT_KEGIATAN,
    params: {
      rencanaId: rencana.id,
      jenis: rencana.jenis,
      ...(rencana.prospekId ? { prospekId: rencana.prospekId } : {}),
      ...(rencana.prospekId && rencana.namaProspek ? { prospekNama: rencana.namaProspek } : {}),
    },
  } as Href;
}

/** Layar tugaskan rencana (pemberi tugas); `salesId` = anggota yang langsung terpilih. */
export function ruteTugaskanRencana(salesId: string | null, tanggal?: string): Href {
  return {
    pathname: '/(app)/presurvei/rencana/tugaskan',
    params: { ...(salesId ? { salesId } : {}), ...(tanggal ? { tanggal } : {}) },
  } as Href;
}

/**
 * Tab Presurvei langsung di sub-tab Rencana tampilan Tim (dari kartu "Tim
 * hari ini"). `diminta` membedakan tiap ketukan supaya tab yang instansinya
 * dipertahankan tetap menerapkan permintaan yang sama berulang kali;
 * `salesId` selalu dikirim (kosong = semua) agar param lama tidak tertinggal.
 */
export function ruteTimRencana(salesId: string | null, diminta: number): Href {
  return {
    pathname: '/(app)/presurvei',
    params: { subTab: 'rencana', salesId: salesId ?? '', diminta: String(diminta) },
  } as Href;
}
