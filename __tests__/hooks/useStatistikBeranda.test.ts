import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

type OpsiQuery = { queryKey: unknown; endpoint: string; enabled: boolean; select: (data: unknown) => unknown };

const mockUseOfflineQuery = jest.fn((_opsi: OpsiQuery) => ({}));
const mockUseAuth = jest.fn();
jest.mock('@/hooks/queries', () => ({ useOfflineQuery: (opsi: OpsiQuery) => mockUseOfflineQuery(opsi) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import { useStatistikBeranda } from '@/hooks/useStatistikBeranda';

describe('useStatistikBeranda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('query key dan endpoint sama dengan Beranda teknisi sehingga cache dipakai bersama', () => {
    mockUseAuth.mockReturnValue({ token: 'tkn' });

    renderHook(() => useStatistikBeranda());

    const opsi = mockUseOfflineQuery.mock.calls[0][0];
    expect(opsi.queryKey).toEqual(['dashboard', 'stats']);
    expect(opsi.endpoint).toBe('/api/mobile/dashboard');
    expect(opsi.enabled).toBe(true);
    expect(opsi.select({ data: { saldoKomisi: 5 } })).toEqual({ saldoKomisi: 5 });
    expect(opsi.select({ saldoKomisi: 7 })).toEqual({ saldoKomisi: 7 });
  });

  it('tanpa token tidak memanggil server', () => {
    mockUseAuth.mockReturnValue({ token: null });

    renderHook(() => useStatistikBeranda());

    expect(mockUseOfflineQuery.mock.calls[0][0].enabled).toBe(false);
  });
});
