/**
 * AppFeature enum — synced with PERMISSION_GROUPS_MOBILE in backend (lib/permission-config.ts).
 * Each value corresponds to a mobile resource string returned in the user's features[] array.
 */
export enum AppFeature {
  // Core
  DASHBOARD = 'm_dashboard',
  WORK_ORDER = 'm_work_order',
  CANVASING = 'm_canvasing',

  // Inventory
  BARANG = 'm_barang',
  BARANG_MASUK = 'm_barang_masuk',
  BARANG_KELUAR = 'm_barang_keluar',

  // HR / Attendance
  ABSENSI = 'm_absensi',
  LEMBUR = 'm_lembur',
  IZIN = 'm_izin',
  HOLIDAYS = 'm_holidays',

  // Communication
  CHAT = 'm_chat',

  // Finance
  SALARY = 'm_salary',

  // Network
  TOPOLOGY = 'm_topology',

  // Partners
  PARTNERS = 'm_partners',

  // Mitra Wallet & Withdraw
  MITRA_WALLET = 'm_mitra_wallet',
  MITRA_WITHDRAW = 'm_mitra_withdraw',

  // Non-permission based (always available)
  PROFILE = 'profile',
}
