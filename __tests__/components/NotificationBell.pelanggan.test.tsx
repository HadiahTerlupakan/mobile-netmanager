import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Lonceng notifikasi adalah permukaan karyawan: endpointnya
 * (`/api/mobile/notifications`) menolak token pelanggan dengan 401, dan
 * penangan 401 global menutup sesi — pelanggan tertendang kembali ke layar
 * login beberapa detik setelah berhasil masuk, sehingga portalnya tidak bisa
 * dipakai sama sekali. Tujuannya pun rute karyawan `(app)/notifications`.
 * Beranda pelanggan ikut memakai `DashboardHeader`, yang memasang lonceng ini.
 */

const mockUseAuth = jest.fn();
const mockUseApiQuery = jest.fn();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/hooks/queries', () => ({
  useApiQuery: (opsi: Record<string, unknown>) => mockUseApiQuery(opsi),
}));
jest.mock('@/lib/queryClient', () => ({
  queryKeys: { notifications: { unread: () => ['notifications', 'unread'] } },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react-native', () => ({ Bell: 'Bell' }));
jest.mock('twrnc', () => require('twrnc-kosong'));

const renderLonceng = (role: string) => {
  mockUseAuth.mockReturnValue({ user: { id: 'u1', role } });
  mockUseApiQuery.mockReturnValue({ data: { data: { unreadCount: 3 } } });
  const NotificationBell = require('@/components/molecules/NotificationBell').default;
  return render(<NotificationBell />);
};

describe('lonceng notifikasi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tidak dirender untuk sesi pelanggan', () => {
    const { toJSON } = renderLonceng('CUSTOMER');

    expect(toJSON()).toBeNull();
  });

  it('tidak memanggil endpoint karyawan untuk sesi pelanggan', () => {
    renderLonceng('CUSTOMER');

    expect(mockUseApiQuery).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/api/mobile/notifications', enabled: false }),
    );
  });

  it('tidak dirender untuk sesi investor', () => {
    // Token investor beraudience sendiri, jadi endpoint notifikasi karyawan
    // juga menjawab 401 untuknya. Beranda investor kebetulan belum memasang
    // lonceng; penjaga ini mencegah penambahannya nanti menendang investor.
    const { toJSON } = renderLonceng('INVESTOR');

    expect(toJSON()).toBeNull();
    expect(mockUseApiQuery).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/api/mobile/notifications', enabled: false }),
    );
  });

  it('tetap tampil dan memanggil endpoint untuk karyawan', () => {
    const { toJSON } = renderLonceng('TEKNISI');

    expect(toJSON()).not.toBeNull();
    expect(mockUseApiQuery).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: '/api/mobile/notifications', enabled: true }),
    );
  });
});
