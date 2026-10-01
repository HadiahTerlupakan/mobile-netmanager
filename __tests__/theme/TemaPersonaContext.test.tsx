import { describe, expect, it, jest } from '@jest/globals';
import { render, renderHook } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import { Button } from '@/components/atoms/Button';
import { PilihanChip } from '@/components/molecules/PilihanChip';
import { TombolPilihanBesar } from '@/components/molecules/TombolPilihanBesar';
import { TombolTabPersona } from '@/components/organisms/navigation/TombolTabPersona';
import { TemaPersonaPenggunaProvider } from '@/components/providers/TemaPersonaPenggunaProvider';
import { PALET_PERSONA, TemaPersonaProvider, useTemaPersona } from '@/theme';
import type { Persona } from '@/utils/persona';

const BIRU = PALET_PERSONA.KARYAWAN_SALES;
const ORANYE = PALET_PERSONA.KARYAWAN_TEKNISI;

const OPSI = [
  { nilai: 'KUNJUNGAN', label: 'Kunjungan' },
  { nilai: 'TELEPON', label: 'Telepon' },
] as const;

/** Bungkus elemen dengan tema persona tertentu. */
function renderDenganPersona(persona: Persona, elemen: React.ReactElement) {
  return render(<TemaPersonaProvider persona={persona}>{elemen}</TemaPersonaProvider>);
}

/** Gaya rata dari elemen host bertombol (TouchableOpacity membungkus View). */
function ambilGaya(elemen: { props: { style?: unknown } }) {
  return StyleSheet.flatten(elemen.props.style as never) as Record<string, unknown>;
}

describe('useTemaPersona', () => {
  it('tanpa penyedia jatuh ke tema bawaan biru sales', () => {
    const { result } = renderHook(() => useTemaPersona());
    expect(result.current.persona).toBe('KARYAWAN_SALES');
    expect(result.current.warna).toEqual(BIRU);
    expect(result.current.tw`bg-utama-kuat`).toEqual({ backgroundColor: '#2563eb' });
  });

  it('penyedia pengguna: tanpa login memakai biru, bukan oranye teknisi', () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useTemaPersona(), { wrapper: TemaPersonaPenggunaProvider });
    expect(result.current.persona).toBe('KARYAWAN_SALES');
  });

  it('penyedia pengguna: teknisi login mendapat oranye', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'TEKNISI', employeeType: 'KARYAWAN', persona: 'TEKNISI' } });
    const { result } = renderHook(() => useTemaPersona(), { wrapper: TemaPersonaPenggunaProvider });
    expect(result.current.persona).toBe('KARYAWAN_TEKNISI');
    expect(result.current.warna.utama).toBe(ORANYE.utama);
    expect(result.current.tw`text-utama-kuat`).toEqual({ color: ORANYE.utamaKuat });
  });
});

describe('komponen bersama mengikuti tema persona', () => {
  it.each([
    ['KARYAWAN_SALES', BIRU.utamaKuat],
    ['KARYAWAN_TEKNISI', ORANYE.utamaKuat],
  ] as [Persona, string][])('PilihanChip %s: chip terpilih berlatar %s', (persona, latar) => {
    const { getByRole } = renderDenganPersona(persona, <PilihanChip opsi={OPSI} terpilih="TELEPON" onPilih={jest.fn()} />);
    expect(ambilGaya(getByRole('button', { name: 'Telepon' }))).toMatchObject({ backgroundColor: latar, borderColor: latar });
    expect(ambilGaya(getByRole('button', { name: 'Kunjungan' }))).toMatchObject({ backgroundColor: '#fff' });
  });

  it.each([
    ['KARYAWAN_SALES', BIRU.utamaKuat],
    ['KARYAWAN_TEKNISI', ORANYE.utamaKuat],
  ] as [Persona, string][])('TombolPilihanBesar %s: pilihan terpilih berlatar %s', (persona, latar) => {
    const { getByRole } = renderDenganPersona(persona, <TombolPilihanBesar opsi={OPSI} terpilih="KUNJUNGAN" onPilih={jest.fn()} />);
    expect(ambilGaya(getByRole('button', { name: 'Kunjungan' }))).toMatchObject({ backgroundColor: latar });
  });

  it.each([
    ['KARYAWAN_SALES', BIRU.utamaKuat],
    ['KARYAWAN_TEKNISI', ORANYE.utamaKuat],
    ['KARYAWAN_STAFF', PALET_PERSONA.KARYAWAN_STAFF.utamaKuat],
  ] as [Persona, string][])('Button primary %s berlatar %s', (persona, latar) => {
    const { getByText } = renderDenganPersona(persona, <Button title="Simpan" />);
    const tombol = getByText('Simpan').parent?.parent;
    expect(ambilGaya(tombol as never)).toMatchObject({ backgroundColor: latar });
  });

  it('warna makna tidak ikut persona: Button danger tetap merah untuk teknisi', () => {
    const { getByText } = renderDenganPersona('KARYAWAN_TEKNISI', <Button title="Hapus" variant="danger" />);
    expect(ambilGaya(getByText('Hapus').parent?.parent as never)).toMatchObject({ backgroundColor: '#dc2626' });
  });

  it.each([
    ['KARYAWAN_SALES', BIRU.utamaKuat],
    ['KARYAWAN_TEKNISI', ORANYE.utamaKuat],
  ] as [Persona, string][])('TombolTabPersona %s: tab aktif memakai %s untuk ikon dan label', (persona, aktif) => {
    const ikon = jest.fn((_props: { color: string }) => null);
    const route = { key: 'beranda-kunci', name: 'dashboard', params: undefined };
    const { getByText } = renderDenganPersona(
      persona,
      <TombolTabPersona
        tab={{ rute: 'dashboard', isTerkunci: false }}
        state={{ index: 0, routes: [route] } as never}
        descriptors={{ [route.key]: { options: { title: 'Beranda', tabBarIcon: ikon } } } as never}
        navigation={{ emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() } as never}
      />,
    );
    expect(ikon).toHaveBeenCalledWith(expect.objectContaining({ color: aktif, focused: true }));
    expect(ambilGaya(getByText('Beranda'))).toMatchObject({ color: aktif });
  });
});
