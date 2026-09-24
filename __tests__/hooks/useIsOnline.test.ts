import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

type Pendengar = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;
let mockPendengar: Pendengar | null = null;
const mockBerhenti = jest.fn();
const mockFetch = jest.fn<() => Promise<{ isConnected: boolean | null; isInternetReachable: boolean | null }>>();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: () => mockFetch(),
    addEventListener: (pendengar: Pendengar) => {
      mockPendengar = pendengar;
      return mockBerhenti;
    },
  },
}));

import { useIsOnline } from '@/hooks/useIsOnline';
import { isStatusOnline } from '@/utils/statusJaringan';

describe('isStatusOnline', () => {
  it('status tak diketahui (null) dianggap online', () => {
    expect(isStatusOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it('offline bila tidak tersambung atau internet tak terjangkau', () => {
    expect(isStatusOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
    expect(isStatusOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });
});

describe('useIsOnline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPendengar = null;
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
  });

  it('membaca status awal lalu mengikuti perubahan', async () => {
    const { result } = renderHook(() => useIsOnline());

    await waitFor(() => expect(result.current).toBe(false));

    act(() => mockPendengar?.({ isConnected: true, isInternetReachable: true }));
    expect(result.current).toBe(true);
  });

  it('berhenti mendengar saat dilepas', () => {
    const { unmount } = renderHook(() => useIsOnline());

    unmount();

    expect(mockBerhenti).toHaveBeenCalledTimes(1);
  });
});
