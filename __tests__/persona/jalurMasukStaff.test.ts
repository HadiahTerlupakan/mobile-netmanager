import { MENU_ITEMS } from '@/constants/menuCepat';
import { MENU_CEPAT_STAFF } from '@/utils/menuCepatStaff';
import { susunMenuCepat } from '@/utils/menuCepat';
import { susunTabKaryawanStaff } from '@/utils/tabKaryawanStaff';

/**
 * Permukaan persona staff ditentukan dua daftar: whitelist tab
 * (`RUTE_TAB_KARYAWAN_STAFF`) dan menu cepat beranda (`MENU_CEPAT_STAFF`).
 * Izin yang tidak tersentuh keduanya menjadi izin tanpa pintu — diberikan
 * server, tapi tak bisa dibuka pengguna.
 */

const konteksStaff = (features: readonly string[]) => ({
  features,
  role: 'SALES',
  isMitra: false,
  menuIds: MENU_CEPAT_STAFF,
  isSembunyikanTerkunci: true,
  idTersembunyi: [] as const,
});

const idMenuTampil = (features: readonly string[]) =>
  susunMenuCepat(konteksStaff(features)).map((t) => t.id);

describe('jalur masuk persona staff', () => {
  // Regresi: role SALES hanya memegang m_canvasing + m_dashboard, dan dulu
  // berakhir dengan 2 tab serta beranda kosong — canvasing tak terjangkau.
  it('memberi jalan masuk canvasing bagi staff yang memegang m_canvasing', () => {
    expect(idMenuTampil(['m_canvasing', 'm_dashboard'])).toContain('canvasing');
  });

  it('tidak menampilkan canvasing bagi staff tanpa m_canvasing', () => {
    expect(idMenuTampil(['m_dashboard'])).not.toContain('canvasing');
  });

  it('menyembunyikan menu yang izinnya tidak dimiliki', () => {
    const tampil = idMenuTampil(['m_canvasing', 'm_dashboard']);
    expect(tampil).not.toContain('izin');
    expect(tampil).not.toContain('lembur');
    expect(tampil).not.toContain('holidays');
  });

  // Penjaga agar kasus "izin tanpa pintu" tidak terulang untuk fitur lain:
  // setiap izin yang dipakai MENU_CEPAT_STAFF harus benar-benar membuka tilenya.
  it.each(MENU_CEPAT_STAFF)(
    'menu staff "%s" terbuka saat izinnya dimiliki',
    (id) => {
      const item = MENU_ITEMS.find((m) => m.id === id);
      expect(item).toBeDefined();

      const features = [...(item!.requiredFeatures ?? []), 'm_dashboard'];
      expect(idMenuTampil(features)).toContain(id);
    },
  );

  // Mengunci kondisi yang terlihat di QA: role SALES hanya menyisakan dua tab,
  // sehingga canvasing memang mustahil dijangkau lewat tab bar dan harus
  // disediakan menu cepat.
  it('menyisakan dua tab saja untuk staff yang hanya punya m_canvasing + m_dashboard', () => {
    const rute = susunTabKaryawanStaff({
      features: ['m_canvasing', 'm_dashboard'],
      role: 'SALES',
      isSales: false,
    }).map((t) => t.rute);

    expect(rute).toEqual(['dashboard', 'profile']);
  });

  it('memunculkan tab absensi dan chat begitu izinnya diberikan', () => {
    const rute = susunTabKaryawanStaff({
      features: ['m_dashboard', 'm_absensi', 'm_chat'],
      role: 'SALES',
      isSales: false,
    }).map((t) => t.rute);

    expect(rute).toEqual(['dashboard', 'absensi', 'chat/index', 'profile']);
  });
});
