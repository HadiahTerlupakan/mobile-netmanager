import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import type { ProspekPilihanRencana } from '@/hooks/presurvei/useFormRencana';

type PropsKalenderUji = { visible: boolean; minDate?: string; onSelect: (tanggal: Date) => void };
type PropsPilihProspekUji = { onPilih: (prospek: ProspekPilihanRencana) => void };

const mockMutate = jest.fn();
let mockIsOnline = true;
let mockKalender: PropsKalenderUji | null = null;
let mockParam: { tanggal?: string } = {};
let mockPilihProspek: PropsPilihProspekUji | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => mockParam,
    useFocusEffect: (efek: () => void) => React.useEffect(() => efek(), [efek]),
  };
});
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: () => true }));
jest.mock('@/hooks/useIsOnline', () => ({ useIsOnline: () => mockIsOnline }));
jest.mock('@/hooks/presurvei/useLingkupRencana', () => ({
  useLingkupRencana: () => ({ isPemberiTugas: false, penggunaId: 's-1' }),
}));
jest.mock('@/hooks/presurvei/useMutasiRencana', () => ({
  useBuatRencana: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock('@/components/molecules/CustomDatePickerModal', () => ({
  __esModule: true,
  default: (props: PropsKalenderUji) => {
    mockKalender = props;
    return null;
  },
}));
jest.mock('@/components/organisms/presurvei/PilihProspekModal', () => ({
  PilihProspekModal: (props: PropsPilihProspekUji) => {
    mockPilihProspek = props;
    return null;
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => require('twrnc-kosong'));

import { keTanggalKalender } from '@/utils/presurvei/rencana';

const renderLayar = () => {
  const Layar = require('../../app/(app)/presurvei/rencana/buat').default;
  return render(<Layar />);
};

describe('Buat Rencana', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    mockKalender = null;
    mockPilihProspek = null;
  });

  it('tujuan wajib diisi sebelum dikirim', () => {
    const { getByText } = renderLayar();

    fireEvent.press(getByText('Simpan Rencana'));

    expect(getByText('Tujuan kunjungan wajib diisi')).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('mengirim tanggal dari kalender, jenis, tujuan, dan prospek terpilih', () => {
    const { getByText, getByLabelText } = renderLayar();

    expect(mockKalender?.minDate).toBe(keTanggalKalender(new Date()));
    act(() => mockKalender?.onSelect(new Date('2030-01-15')));
    fireEvent.press(getByLabelText('Telepon'));
    fireEvent.changeText(getByLabelText('Tujuan kunjungan'), '  Tawarkan promo ');
    fireEvent.press(getByText('Pilih prospek'));
    act(() => mockPilihProspek?.onPilih({ id: 'p-2', nama: 'Rina', alamat: 'Jl. Kenanga 2' }));
    fireEvent.press(getByText('Simpan Rencana'));

    expect(getByText('Rina')).toBeTruthy();
    // Telepon tidak mendatangi tempat: kolom alamat diganti keterangan, alamat prospek tidak terkirim.
    expect(getByText('Telepon dan chat tidak perlu alamat.')).toBeTruthy();
    expect(mockMutate).toHaveBeenCalledWith({
      tanggal: '2030-01-15',
      jam: null,
      jenis: 'TELEPON',
      tujuan: 'Tawarkan promo',
      prospekId: 'p-2',
      alamat: null,
    });
  });

  it('kunjungan: contoh tujuan siap ketuk dan alamat prospek terisi otomatis', () => {
    const { getByText, getByLabelText } = renderLayar();

    fireEvent.press(getByLabelText('Tawarkan paket internet'));
    fireEvent.press(getByText('Pilih prospek'));
    act(() => mockPilihProspek?.onPilih({ id: 'p-3', nama: 'Pak Budi', alamat: 'Jl. Melati 5' }));
    expect(getByLabelText('Alamat tujuan').props.value).toBe('Jl. Melati 5');

    fireEvent.press(getByText('Simpan Rencana'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'KUNJUNGAN', tujuan: 'Tawarkan paket internet', prospekId: 'p-3', alamat: 'Jl. Melati 5' }),
    );
  });

  it('perantara terpilih ditandai lencananya dan alamatnya tetap mengisi alamat tujuan', () => {
    const { getByText, getByLabelText } = renderLayar();

    expect(getByText('Boleh dikosongkan. Calon pelanggan atau perantara (ketua RT, tokoh, dll.)')).toBeTruthy();
    fireEvent.press(getByLabelText('Tawarkan paket internet'));
    fireEvent.press(getByText('Pilih prospek'));
    act(() =>
      mockPilihProspek?.onPilih({ id: 'p-4', nama: 'Pak Slamet', alamat: 'Jl. Mawar 3', jenis: 'PERANTARA', peran: 'Ketua RT 03' }),
    );

    expect(getByText('Perantara · Ketua RT 03')).toBeTruthy();
    expect(getByLabelText('Alamat tujuan').props.value).toBe('Jl. Mawar 3');
    fireEvent.press(getByLabelText('Lepas prospek'));
    expect(getByText('Pilih prospek')).toBeTruthy();
  });

  it('jam dipilih dengan mengetuk tombol jam dan ikut terkirim; batal tidak mengubahnya', () => {
    const { getByText, getByLabelText, queryByLabelText } = renderLayar();

    fireEvent.press(getByLabelText('Pilih jam'));
    fireEvent.press(getByLabelText('Batal'));
    expect(queryByLabelText('Pukul 14.30')).toBeNull();

    fireEvent.press(getByLabelText('Pilih jam'));
    fireEvent.press(getByLabelText('Jam 14.30'));
    expect(getByLabelText('Pukul 14.30')).toBeTruthy();

    // "Tanpa jam" mengosongkan jam lagi; pilih ulang untuk dikirim.
    fireEvent.press(getByLabelText('Tanpa jam'));
    expect(getByText(/Tidak pakai jam/)).toBeTruthy();
    fireEvent.press(getByLabelText('Pilih jam'));
    fireEvent.press(getByLabelText('Jam 14.30'));

    fireEvent.changeText(getByLabelText('Tujuan kunjungan'), 'Demo paket');
    fireEvent.press(getByText('Simpan Rencana'));

    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ jam: '14:30', tujuan: 'Demo paket' }));
  });

  it('offline: menjelaskan butuh internet dan tombol simpan nonaktif', () => {
    mockIsOnline = false;
    const { getByText } = renderLayar();

    expect(getByText(/butuh koneksi internet/)).toBeTruthy();
    fireEvent.press(getByText('Simpan Rencana'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('tanggal agenda di masa depan menjadi tanggal awal; tanggal lampau diabaikan', () => {
    mockParam = { tanggal: '2099-12-31' };
    const pertama = renderLayar();
    fireEvent.changeText(pertama.getByLabelText('Tujuan kunjungan'), 'Demo');
    fireEvent.press(pertama.getByText('Simpan Rencana'));
    expect(mockMutate).toHaveBeenLastCalledWith(expect.objectContaining({ tanggal: '2099-12-31' }));
    pertama.unmount();

    mockParam = { tanggal: '2000-01-01' };
    const kedua = renderLayar();
    fireEvent.changeText(kedua.getByLabelText('Tujuan kunjungan'), 'Demo');
    fireEvent.press(kedua.getByText('Simpan Rencana'));
    expect(mockMutate).toHaveBeenLastCalledWith(expect.objectContaining({ tanggal: keTanggalKalender(new Date()) }));
    mockParam = {};
  });
});
