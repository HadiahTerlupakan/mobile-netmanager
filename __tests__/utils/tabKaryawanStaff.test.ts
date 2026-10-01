import { describe, expect, it } from '@jest/globals';

import { susunTabKaryawanStaff } from '@/utils/tabKaryawanStaff';

const STAFF_LENGKAP = {
  role: 'STAFF',
  isSales: false,
  features: ['m_dashboard', 'm_absensi', 'm_chat', 'm_work_order', 'm_barang', 'm_canvasing', 'm_presurvei'],
};

describe('susunTabKaryawanStaff', () => {
  it('urutan Beranda · Absensi · Chat · Profil tanpa Work Order, Barang, Canvasing, Presurvei', () => {
    expect(susunTabKaryawanStaff(STAFF_LENGKAP)).toEqual([
      { rute: 'dashboard', isTerkunci: false },
      { rute: 'absensi', isTerkunci: false },
      { rute: 'chat/index', isTerkunci: false },
      { rute: 'profile', isTerkunci: false },
    ]);
  });

  it('Absensi dan Chat tanpa izin: disembunyikan, bukan dikunci', () => {
    expect(susunTabKaryawanStaff({ ...STAFF_LENGKAP, features: ['m_dashboard'] })).toEqual([
      { rute: 'dashboard', isTerkunci: false },
      { rute: 'profile', isTerkunci: false },
    ]);
  });

  it('Beranda terkunci tanpa m_dashboard; Profil selalu terbuka', () => {
    expect(susunTabKaryawanStaff({ ...STAFF_LENGKAP, features: [] })).toEqual([
      { rute: 'dashboard', isTerkunci: true },
      { rute: 'profile', isTerkunci: false },
    ]);
  });

  it('SUPER_ADMIN mendapat semua tab staff; pengguna belum dimuat hanya Beranda (terkunci) & Profil', () => {
    expect(susunTabKaryawanStaff({ role: 'SUPER_ADMIN', features: [] }).map((tab) => tab.rute)).toEqual([
      'dashboard',
      'absensi',
      'chat/index',
      'profile',
    ]);
    expect(susunTabKaryawanStaff(null)).toEqual([
      { rute: 'dashboard', isTerkunci: true },
      { rute: 'profile', isTerkunci: false },
    ]);
  });
});
