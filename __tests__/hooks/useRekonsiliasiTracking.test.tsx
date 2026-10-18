import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

const mockLacak = {
  syncPendingLocations: jest.fn(async () => 0),
  isTrackingActive: jest.fn(async () => false),
  stopTracking: jest.fn(async () => undefined),
};
const mockPulihkan = jest.fn(async () => undefined);
const mockGet = jest.fn<(url: string) => Promise<unknown>>();

jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ token: 'token' }) }));
jest.mock('@/services/LocationTrackingService', () => ({
  get LocationTrackingService() {
    return mockLacak;
  },
}));
jest.mock('@/services/penjagaTracking', () => ({ pulihkanTrackingSesi: () => mockPulihkan() }));
jest.mock('@/services/api', () => ({ __esModule: true, default: { get: (url: string) => mockGet(url) } }));
jest.mock('@/utils/logger');

import { useRekonsiliasiTracking } from '@/hooks/useRekonsiliasiTracking';

const statusAbsen = (status: string) => ({ data: { data: { status } } });

describe('useRekonsiliasiTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  });

  it('memulihkan tracking karyawan yang masih check-in walau tracking-nya sudah mati', async () => {
    mockLacak.isTrackingActive.mockResolvedValue(false);
    mockGet.mockResolvedValue(statusAbsen('checked-in'));

    renderHook(() => useRekonsiliasiTracking());

    await waitFor(() => expect(mockPulihkan).toHaveBeenCalled());
    expect(mockLacak.stopTracking).not.toHaveBeenCalled();
  });

  it('menghentikan tracking sesudah check-out', async () => {
    mockLacak.isTrackingActive.mockResolvedValue(true);
    mockGet.mockResolvedValue(statusAbsen('checked-out'));

    renderHook(() => useRekonsiliasiTracking());

    await waitFor(() => expect(mockLacak.stopTracking).toHaveBeenCalled());
    expect(mockPulihkan).not.toHaveBeenCalled();
  });

  it('status yang tidak terbaca tidak mengubah apa pun', async () => {
    mockLacak.isTrackingActive.mockResolvedValue(true);
    mockGet.mockRejectedValue(new Error('Network Error'));

    renderHook(() => useRekonsiliasiTracking());

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockPulihkan).not.toHaveBeenCalled();
    expect(mockLacak.stopTracking).not.toHaveBeenCalled();
  });
});
