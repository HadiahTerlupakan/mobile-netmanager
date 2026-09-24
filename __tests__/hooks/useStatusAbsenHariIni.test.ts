import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseApiQuery = jest.fn();
const mockUseAuth = jest.fn();
jest.mock('@/hooks/queries/useApiQuery', () => ({ useApiQuery: (opsi: unknown) => mockUseApiQuery(opsi) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import { ENDPOINT_STATUS_ABSEN, useStatusAbsenHariIni } from '@/hooks/useStatusAbsenHariIni';

const karyawan = (features: string[], token: string | null = 'tkn') => ({
  user: { id: 'u-1', role: 'SALES', features },
  token,
});

describe('useStatusAbsenHariIni', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('memakai query key dan endpoint yang sama dengan layar Absensi', () => {
    mockUseAuth.mockReturnValue(karyawan(['m_absensi']));

    renderHook(() => useStatusAbsenHariIni());

    expect(ENDPOINT_STATUS_ABSEN).toBe('/api/mobile/attendance/status');
    expect(mockUseApiQuery).toHaveBeenCalledWith({
      queryKey: ['attendance', 'status', 'u-1'],
      endpoint: '/api/mobile/attendance/status',
      enabled: true,
    });
  });

  it('tanpa izin m_absensi tidak memanggil server (S11)', () => {
    mockUseAuth.mockReturnValue(karyawan(['m_presurvei']));

    renderHook(() => useStatusAbsenHariIni());

    expect(mockUseApiQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('tanpa token tidak memanggil server', () => {
    mockUseAuth.mockReturnValue(karyawan(['m_absensi'], null));

    renderHook(() => useStatusAbsenHariIni());

    expect(mockUseApiQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
