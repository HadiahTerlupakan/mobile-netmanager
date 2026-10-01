import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

type PropsFormUji = { onBerhasil: (prospek: { id: string }) => void };

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockIsDiizinkan = true;
let mockPropsForm: PropsFormUji | null = null;
let mockJumlahPasangForm = 0;
let mockLepasFokus: (() => void) | undefined;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ replace: mockReplace, back: mockBack, push: mockPush }),
    useFocusEffect: (efek: () => (() => void) | undefined) =>
      React.useEffect(() => {
        mockLepasFokus = efek();
      }, [efek]),
  };
});
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: () => mockIsDiizinkan }));
jest.mock('@/components/organisms/presurvei/FormTambahProspek', () => {
  const React = require('react');
  return {
    FormTambahProspek: (props: PropsFormUji) => {
      mockPropsForm = props;
      React.useEffect(() => {
        mockJumlahPasangForm += 1;
      }, []);
      return null;
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/prospek/baru').default;
  return render(<Layar />);
};

describe('Layar Tambah Prospek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDiizinkan = true;
    mockPropsForm = null;
    mockJumlahPasangForm = 0;
    mockLepasFokus = undefined;
  });

  it('berjudul Tambah Prospek dan Kembali menutup layar', () => {
    const { getByText, getByLabelText } = renderLayar();

    expect(getByText('Tambah Prospek')).toBeTruthy();
    fireEvent.press(getByLabelText('Kembali'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('sukses menutup form lalu membuka rincian (Kembali dari rincian ke daftar, bukan ke form)', () => {
    renderLayar();

    act(() => mockPropsForm?.onBerhasil({ id: 'p-baru' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/presurvei/prospek/[id]', params: { id: 'p-baru' } });
    expect(mockBack.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('meninggalkan layar mengosongkan form untuk kunjungan berikutnya', () => {
    renderLayar();
    expect(mockJumlahPasangForm).toBe(1);

    act(() => mockLepasFokus?.());

    expect(mockJumlahPasangForm).toBe(2);
  });

  it('tanpa izin fitur tidak menampilkan form', () => {
    mockIsDiizinkan = false;
    const { queryByText } = renderLayar();

    expect(queryByText('Tambah Prospek')).toBeNull();
    expect(mockPropsForm).toBeNull();
  });
});
