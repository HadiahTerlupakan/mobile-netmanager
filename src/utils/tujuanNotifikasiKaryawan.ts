import type { Href } from 'expo-router';

import { RUTE_DAFTAR_PENGESAHAN, ruteDetailPengesahan } from '@/constants/rutePengesahan';
import { isRuteNotifikasiDikenal, petakanRuteNotifikasi } from '@/utils/ruteNotifikasi';

/** Asal notifikasi karyawan: kolom yang sama di daftar in-app dan di data push FCM. */
export type SumberNotifikasiKaryawan = {
  sourceType?: string | null;
  sourceId?: string | null;
  link?: string | null;
};

const RUTE_BERANDA = '/(app)/dashboard' as Href;
const RUTE_CANVASING = '/(app)/marketing/canvasing' as Href;

/** Tautan notifikasi yang punya layar di aplikasi, atau `null` bila tautan web/tak dikenal. */
function tautanAplikasi(link: string | null | undefined): Href | null {
  if (!link) return null;
  const rute = petakanRuteNotifikasi(link);
  return isRuteNotifikasiDikenal(rute) ? (rute as Href) : null;
}

/** Layar detail bila ada id sumber, selain itu layar daftarnya. */
function detailAtauDaftar(sourceId: string | null | undefined, ruteDetail: (id: string) => Href, ruteDaftar: Href): Href {
  return sourceId ? ruteDetail(sourceId) : ruteDaftar;
}

/**
 * Layar tujuan saat notifikasi karyawan dibuka, dari daftar notifikasi maupun dari
 * tap push. Tautan (`link`/`data.url`) ditulis server sebagai rute WEB, mis.
 * `/admin/workorders/<id>`, yang tidak ada di aplikasi; karena itu tujuan
 * ditentukan dari `sourceType`/`sourceId`. Satu fungsi untuk dua jalur supaya tap
 * push tidak lagi mendarat di Beranda sementara daftar in-app membuka detailnya.
 */
export function tujuanNotifikasiKaryawan(sumber: SumberNotifikasiKaryawan): Href {
  const { sourceType, sourceId, link } = sumber;
  switch (sourceType) {
    case 'WORK_ORDER':
      return detailAtauDaftar(sourceId, (id) => `/(app)/work-order-detail/${id}` as Href, '/(app)/work-order' as Href);
    case 'ATTENDANCE':
      return '/(app)/absensi' as Href;
    case 'LEAVE':
      return '/(app)/izin' as Href;
    case 'OVERTIME':
      return '/(app)/lembur' as Href;
    case 'CANVASING':
    case 'POINT_CLAIM':
      return tautanAplikasi(link) ?? RUTE_CANVASING;
    case 'INVENTORY':
      return '/(app)/barang' as Href;
    case 'PRESURVEI_RENCANA':
      return detailAtauDaftar(sourceId, (id) => `/(app)/presurvei/rencana/${id}` as Href, '/(app)/presurvei' as Href);
    case 'KELUHAN':
      return detailAtauDaftar(sourceId, (id) => `/(app)/keluhan/${id}` as Href, '/(app)/keluhan' as Href);
    case 'ENDORSEMENT':
      return detailAtauDaftar(sourceId, ruteDetailPengesahan, RUTE_DAFTAR_PENGESAHAN);
    default:
      return tautanAplikasi(link) ?? RUTE_BERANDA;
  }
}
