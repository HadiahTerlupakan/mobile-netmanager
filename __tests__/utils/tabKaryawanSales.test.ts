import { describe, expect, it } from '@jest/globals';

import { isTabBarDisembunyikan, susunTabKaryawanSales } from '@/utils/tabKaryawanSales';

const SALES_LENGKAP = {
  role: 'SALES',
  isSales: true,
  features: ['m_dashboard', 'm_presurvei', 'm_canvasing', 'm_absensi', 'm_work_order', 'm_barang'],
};

describe('susunTabKaryawanSales', () => {
  it('urutan Beranda · Presurvei · Canvasing · Absensi · Profil tanpa Work Order dan Barang', () => {
    expect(susunTabKaryawanSales(SALES_LENGKAP)).toEqual([
      { rute: 'dashboard', isTerkunci: false },
      { rute: 'presurvei/index', isTerkunci: false },
      { rute: 'marketing/canvasing/index', isTerkunci: false },
      { rute: 'absensi', isTerkunci: false },
      { rute: 'profile', isTerkunci: false },
    ]);
  });

  it('menampilkan Presurvei terkunci bagi sales tanpa m_presurvei', () => {
    const tab = susunTabKaryawanSales({ ...SALES_LENGKAP, features: ['m_dashboard', 'm_canvasing', 'm_absensi'] });

    expect(tab.find((t) => t.rute === 'presurvei/index')).toEqual({ rute: 'presurvei/index', isTerkunci: true });
  });

  it('Canvasing dan Absensi mengikuti gerbang lama: disembunyikan, bukan dikunci', () => {
    const tanpaIzin = susunTabKaryawanSales({ ...SALES_LENGKAP, features: ['m_dashboard', 'm_presurvei'] });
    const bukanSales = susunTabKaryawanSales({ ...SALES_LENGKAP, isSales: false });

    expect(tanpaIzin.map((t) => t.rute)).toEqual(['dashboard', 'presurvei/index', 'profile']);
    expect(bukanSales.map((t) => t.rute)).not.toContain('marketing/canvasing/index');
  });
});

describe('isTabBarDisembunyikan', () => {
  it('benar hanya bila tabBarStyle layar menyembunyikan tab bar', () => {
    expect(isTabBarDisembunyikan({ tabBarStyle: { display: 'none' } })).toBe(true);
    expect(isTabBarDisembunyikan({ tabBarStyle: { display: 'flex' } })).toBe(false);
    expect(isTabBarDisembunyikan({ tabBarStyle: undefined })).toBe(false);
  });
});
