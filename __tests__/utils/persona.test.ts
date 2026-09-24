import { describe, expect, it } from '@jest/globals';

import type { User } from '@/context/AuthContext';
import { isPersonaMitra, punyaFitur, tentukanPersona, type Persona } from '@/utils/persona';

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
