/** Route di grup `(app)` yang terdaftar di `Tabs` tetapi tidak pernah tampil sebagai tab. */
export interface RuteLayarTersembunyi {
  nama: string;
  /** Layar penuh: tab bar disembunyikan (`tabBarStyle: {display: 'none'}`) saat layar ini terbuka. */
  isLayarPenuh: boolean;
}

/**
 * Daftar route tersembunyi dalam urutan deklarasi di `app/(app)/_layout.tsx`.
 * Urutan dipertahankan karena menentukan urutan `state.routes` navigator tab.
 */
export const RUTE_LAYAR_TERSEMBUNYI: readonly RuteLayarTersembunyi[] = [
  { nama: 'history', isLayarPenuh: false },
  { nama: 'work-order-detail/[id]', isLayarPenuh: true },
  { nama: 'ambil-barang/[id]', isLayarPenuh: true },
  { nama: 'lembur', isLayarPenuh: false },
  { nama: 'izin', isLayarPenuh: false },
  { nama: 'notifications', isLayarPenuh: false },
  { nama: 'topology-map', isLayarPenuh: false },
  { nama: 'pelanggan/isolir', isLayarPenuh: false },
  { nama: 'complete-work-order/[id]', isLayarPenuh: true },
  { nama: 'kembalikan-barang/[id]', isLayarPenuh: true },
  // Chat — dibuka dari menu cepat
  { nama: 'chat/index', isLayarPenuh: false },
  { nama: 'chat/[conversationId]', isLayarPenuh: true },
  { nama: 'chat/new', isLayarPenuh: true },
  { nama: 'holidays', isLayarPenuh: false },
  { nama: 'edit-profile', isLayarPenuh: false },
  { nama: 'change-password', isLayarPenuh: false },
  // Mitra — dibuka dari wallet
  { nama: 'mitra-withdraw', isLayarPenuh: true },
  { nama: 'id-card/[id]', isLayarPenuh: true },
  // Marketing / Canvasing
  { nama: 'marketing/canvasing/create', isLayarPenuh: false },
  { nama: 'marketing/canvasing/[id]/index', isLayarPenuh: true },
  { nama: 'marketing/canvasing/[id]/claim', isLayarPenuh: true },
  // Presurvei — layar di luar tab bar
  { nama: 'presurvei/kegiatan/catat', isLayarPenuh: true },
  { nama: 'presurvei/prospek/[id]/index', isLayarPenuh: true },
  { nama: 'presurvei/prospek/[id]/jadikan-canvasing', isLayarPenuh: true },
  // Permintaan WO — dibuka dari daftar WO
  { nama: 'request-work-order', isLayarPenuh: false },
];
