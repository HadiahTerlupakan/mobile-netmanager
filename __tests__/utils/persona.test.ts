import { describe, expect, it } from '@jest/globals';

import type { User } from '@/context/AuthContext';
import { bolehCanvasing, isPersonaMitra, punyaFitur, tentukanPersona, type Persona } from '@/utils/persona';

/** employeeType × isSales → persona; tupel bertipe agar `it.each` lolos tsc (TS2345 bila `as const`). */
const KASUS_PERSONA: [User['employeeType'], boolean | undefined, Persona][] = [
  ['KARYAWAN', true, 'KARYAWAN_SALES'],
  ['KARYAWAN', false, 'KARYAWAN_TEKNISI'],
  ['KARYAWAN', undefined, 'KARYAWAN_TEKNISI'],
  ['MITRA_SALES', true, 'MITRA_SALES'],
  ['MITRA_SALES', false, 'MITRA_SALES'],
  ['MITRA_SALES', undefined, 'MITRA_SALES'],
  ['MITRA_TEKNISI', true, 'MITRA_TEKNISI'],
  ['MITRA_TEKNISI', false, 'MITRA_TEKNISI'],
  ['MITRA_TEKNISI', undefined, 'MITRA_TEKNISI'],
  [undefined, true, 'KARYAWAN_SALES'],
  [undefined, false, 'KARYAWAN_TEKNISI'],
  [undefined, undefined, 'KARYAWAN_TEKNISI'],
];

describe('tentukanPersona', () => {
  it.each(KASUS_PERSONA)('employeeType %s × isSales %s → %s', (employeeType, isSales, harapan) => {
    expect(tentukanPersona({ employeeType, isSales })).toBe(harapan);
  });

  it('pengguna belum dimuat diperlakukan seperti teknisi karyawan (perilaku lama)', () => {
    expect(tentukanPersona(null)).toBe('KARYAWAN_TEKNISI');
    expect(tentukanPersona(undefined)).toBe('KARYAWAN_TEKNISI');
  });

  it('hanya persona mitra yang dianggap mitra', () => {
    expect(isPersonaMitra('MITRA_SALES')).toBe(true);
    expect(isPersonaMitra('MITRA_TEKNISI')).toBe(true);
    expect(isPersonaMitra('KARYAWAN_SALES')).toBe(false);
    expect(isPersonaMitra('KARYAWAN_TEKNISI')).toBe(false);
    expect(isPersonaMitra('KARYAWAN_STAFF')).toBe(false);
    expect(isPersonaMitra('KARYAWAN_FINANCE')).toBe(false);
    expect(isPersonaMitra('KARYAWAN_DIREKTUR')).toBe(false);
  });
});

/** persona server × isSales → persona; persona server menang atas isSales. */
const KASUS_PERSONA_SERVER: [User['persona'], boolean | undefined, Persona][] = [
  ['STAFF', false, 'KARYAWAN_STAFF'],
  ['STAFF', undefined, 'KARYAWAN_STAFF'],
  ['TEKNISI', false, 'KARYAWAN_TEKNISI'],
  ['SALES', true, 'KARYAWAN_SALES'],
  ['SALES', false, 'KARYAWAN_SALES'],
  ['FINANCE', false, 'KARYAWAN_FINANCE'],
  ['DIREKTUR', false, 'KARYAWAN_DIREKTUR'],
];

describe('tentukanPersona — persona dari server', () => {
  it.each(KASUS_PERSONA_SERVER)('persona %s × isSales %s → %s', (persona, isSales, harapan) => {
    expect(tentukanPersona({ employeeType: 'KARYAWAN', persona, isSales })).toBe(harapan);
  });

  it('staff tidak lagi jatuh ke tampilan teknisi', () => {
    expect(tentukanPersona({ employeeType: 'KARYAWAN', persona: 'STAFF', isSales: false })).not.toBe('KARYAWAN_TEKNISI');
  });

  it('server/cache lama tanpa persona memakai aturan lama isSales', () => {
    expect(tentukanPersona({ employeeType: 'KARYAWAN', isSales: true })).toBe('KARYAWAN_SALES');
    expect(tentukanPersona({ employeeType: 'KARYAWAN', isSales: false })).toBe('KARYAWAN_TEKNISI');
  });

  it('nilai persona yang belum dikenal aplikasi ini memakai aturan lama', () => {
    const personaBaru = { employeeType: 'KARYAWAN', persona: 'INVESTOR', isSales: true } as unknown as User;
    expect(tentukanPersona(personaBaru)).toBe('KARYAWAN_SALES');
    expect(tentukanPersona({ ...personaBaru, persona: 'constructor', isSales: false } as unknown as User)).toBe(
      'KARYAWAN_TEKNISI',
    );
  });

  it('mitra tetap dari employeeType walau membawa persona', () => {
    expect(tentukanPersona({ employeeType: 'MITRA_SALES', persona: 'STAFF' })).toBe('MITRA_SALES');
    expect(tentukanPersona({ employeeType: 'MITRA_TEKNISI', persona: 'SALES' })).toBe('MITRA_TEKNISI');
  });
});

describe('punyaFitur', () => {
  it('membaca daftar fitur pengguna', () => {
    expect(punyaFitur({ role: 'SALES', features: ['m_presurvei'] }, 'm_presurvei')).toBe(true);
    expect(punyaFitur({ role: 'SALES', features: ['m_canvasing'] }, 'm_presurvei')).toBe(false);
  });

  it('SUPER_ADMIN selalu punya fitur; tanpa pengguna atau daftar fitur tidak', () => {
    expect(punyaFitur({ role: 'SUPER_ADMIN', features: [] }, 'm_presurvei')).toBe(true);
    expect(punyaFitur(null, 'm_presurvei')).toBe(false);
    expect(punyaFitur({ role: 'SALES' }, 'm_presurvei')).toBe(false);
  });
});

describe('bolehCanvasing', () => {
  it('cukup izin m_canvasing — sales maupun teknisi', () => {
    expect(bolehCanvasing({ role: 'SALES', features: ['m_canvasing'] })).toBe(true);
    expect(bolehCanvasing({ role: 'TEKNISI', features: ['m_canvasing', 'm_work_order'] })).toBe(true);
    expect(bolehCanvasing({ role: 'SALES', features: ['m_presurvei'] })).toBe(false);
  });

  it('SUPER_ADMIN selalu boleh; tanpa pengguna tidak boleh', () => {
    expect(bolehCanvasing({ role: 'SUPER_ADMIN', features: [] })).toBe(true);
    expect(bolehCanvasing(null)).toBe(false);
  });
});
