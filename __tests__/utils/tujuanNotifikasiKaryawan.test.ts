import { describe, expect, it } from '@jest/globals';

import { tujuanNotifikasiKaryawan } from '@/utils/tujuanNotifikasiKaryawan';

// Regresi 2026-11-03: tap push "Work Order Baru" mendarat di Beranda karena
// data.url berisi rute web `/admin/workorders/<id>` yang tak dikenal aplikasi.
describe('tujuanNotifikasiKaryawan', () => {
  it('push WO dengan tautan web admin membuka detail WO di aplikasi', () => {
    expect(
      tujuanNotifikasiKaryawan({ sourceType: 'WORK_ORDER', sourceId: 'wo-1', link: '/admin/workorders/wo-1' }),
    ).toBe('/(app)/work-order-detail/wo-1');
  });

  it('WO tanpa id membuka daftar WO', () => {
    expect(tujuanNotifikasiKaryawan({ sourceType: 'WORK_ORDER' })).toBe('/(app)/work-order');
  });

  it('canvasing dengan tautan web admin jatuh ke daftar canvasing, bukan rute tak dikenal', () => {
    expect(
      tujuanNotifikasiKaryawan({ sourceType: 'CANVASING', sourceId: 'c-1', link: '/admin/marketing/canvasing/c-1' }),
    ).toBe('/(app)/marketing/canvasing');
    expect(
      tujuanNotifikasiKaryawan({ sourceType: 'CANVASING', link: '/marketing/canvasing/c-1' }),
    ).toBe('/marketing/canvasing/c-1');
  });

  it('sumber lain memetakan ke layar masing-masing', () => {
    expect(tujuanNotifikasiKaryawan({ sourceType: 'LEAVE' })).toBe('/(app)/izin');
    expect(tujuanNotifikasiKaryawan({ sourceType: 'KELUHAN', sourceId: 'k-1' })).toBe('/(app)/keluhan/k-1');
    expect(tujuanNotifikasiKaryawan({ sourceType: 'ENDORSEMENT', sourceId: 'd-1' })).toBe('/(app)/pengesahan/d-1');
  });

  it('sumber tak dikenal memakai tautan aplikasi bila ada, selain itu Beranda', () => {
    expect(tujuanNotifikasiKaryawan({ sourceType: 'LAIN', link: '/karyawan/absensi' })).toBe('/absensi');
    expect(tujuanNotifikasiKaryawan({ sourceType: 'LAIN', link: '/admin/apa-saja' })).toBe('/(app)/dashboard');
  });
});
