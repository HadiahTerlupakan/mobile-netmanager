import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
// Layar memakai banyak ikon; proxy ini mengembalikan komponen kosong untuk ikon apa pun.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('twrnc', () => () => ({}));

import { AppFeature } from '@/constants/features';

const ISOLIR_TILE = 'Isolir';

describe('QuickMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderMenu = (props: Record<string, unknown>) => {
    const { QuickMenu } = require('@/components/organisms/dashboard/QuickMenu');
    return render(<QuickMenu {...props} />);
  };

  it('menyembunyikan menu internal Isolir dari mitra eksternal', () => {
    const { queryByText } = renderMenu({ isMitra: true, features: [] });

    expect(queryByText(ISOLIR_TILE)).toBeNull();
    // Menu mitra lain tetap tampil: penanda internalOnly tidak boleh menyapu semuanya.
    expect(queryByText('Request WO')).toBeTruthy();
  });

  it('menampilkan menu Isolir untuk karyawan internal yang punya m_pelanggan', () => {
    const { getByText } = renderMenu({ isMitra: false, features: [AppFeature.PELANGGAN] });

    expect(getByText(ISOLIR_TILE)).toBeTruthy();
  });

  it('tetap menyembunyikan menu Isolir dari mitra walau punya m_pelanggan', () => {
    const { queryByText } = renderMenu({ isMitra: true, features: [AppFeature.PELANGGAN] });

    expect(queryByText(ISOLIR_TILE)).toBeNull();
  });

  it('membiarkan SUPER_ADMIN internal melihat menu Isolir', () => {
    const { getByText } = renderMenu({ isMitra: false, features: [], role: 'SUPER_ADMIN' });

    expect(getByText(ISOLIR_TILE)).toBeTruthy();
  });

  it('tidak menampilkan Presurvei bagi teknisi tanpa m_presurvei', () => {
    const { queryByText } = renderMenu({ isMitra: false, features: [AppFeature.WORK_ORDER] });

    expect(queryByText('Presurvei')).toBeNull();
  });

  it('menampilkan Presurvei aktif bagi teknisi ber-izin dan membuka tab presurvei', () => {
    const { getByText } = renderMenu({ isMitra: false, features: [AppFeature.PRESURVEI] });

    fireEvent.press(getByText('Presurvei'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/presurvei');
  });

  it('mitra tidak pernah melihat Presurvei walau punya m_presurvei', () => {
    const { queryByText } = renderMenu({ isMitra: true, features: [AppFeature.PRESURVEI] });

    expect(queryByText('Presurvei')).toBeNull();
  });

  it('menuIds membatasi menu cepat pada id yang diminta', () => {
    const { getByText, queryByText } = renderMenu({
      isMitra: false,
      features: [AppFeature.CHAT, AppFeature.IZIN, AppFeature.WORK_ORDER, AppFeature.LEMBUR, AppFeature.PRESURVEI],
      menuIds: ['chat', 'izin'],
    });

    expect(getByText('Chat')).toBeTruthy();
    expect(getByText('Izin & Cuti')).toBeTruthy();
    expect(queryByText('Request WO')).toBeNull();
    expect(queryByText('Lembur')).toBeNull();
    expect(queryByText('Presurvei')).toBeNull();
  });

  it('mitra tetap tidak melihat Izin & Cuti dan Lembur', () => {
    // Dulu disaring lewat judul (QuickMenu.tsx:147); kini lewat id.
    const { queryByText } = renderMenu({ isMitra: true, features: [] });

    expect(queryByText('Izin & Cuti')).toBeNull();
    expect(queryByText('Lembur')).toBeNull();
  });

  it('menuIds tidak melewati pemeriksaan izin', () => {
    const { Alert } = require('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText } = renderMenu({ isMitra: false, features: [], menuIds: ['chat'] });

    fireEvent.press(getByText('Chat'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Akses Terbatas', expect.any(String), expect.any(Array));
    alert.mockRestore();
  });
});
