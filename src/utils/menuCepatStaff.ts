import type { IdMenuCepat } from '@/constants/menuCepat';

/**
 * Menu cepat beranda staff: pendukung kepegawaian, dan hanya yang berizin
 * (`isSembunyikanTerkunci`). Slip gaji (`m_salary`) belum punya layar mobile,
 * jadi belum ditawarkan. Pengesahan tampil hanya bila ada surat untuk saya.
 *
 * `canvasing` ikut di sini karena tab bar staff hanya memuat empat rute inti
 * (`RUTE_TAB_KARYAWAN_STAFF`). Tanpa entri ini, role yang memegang
 * `m_canvasing` tapi berpersona STAFF tidak punya jalan masuk sama sekali ke
 * fitur yang izinnya sudah diberikan.
 *
 * Daftar ini sengaja bertetangga dengan `tabKaryawanStaff.ts`: keduanya
 * bersama-sama menentukan seluruh permukaan yang bisa dijangkau persona staff.
 */
export const MENU_CEPAT_STAFF: readonly IdMenuCepat[] = [
  'pengesahan',
  'izin',
  'lembur',
  'holidays',
  'chat',
  'canvasing',
];
