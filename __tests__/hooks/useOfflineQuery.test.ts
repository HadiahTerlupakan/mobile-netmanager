import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOfflineQuery } from '../../hooks/useOfflineQuery';
import { DatabaseService } from '../../services/DatabaseService';
import { SyncService } from '../../services/SyncService';

// Mock services
jest.mock('../../services/SyncService', () => ({
  SyncService: {
    isOnline: jest.fn(),
  }
}));

jest.mock('../../services/DatabaseService', () => ({
  DatabaseService: {
    saveOfflineData: jest.fn().mockResolvedValue(undefined),
    getOfflineData: jest.fn().mockResolvedValue(null),
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useOfflineQuery', () => {
  const mockFetcher = jest.fn();
  const defaultOptions = {
    key: 'test_key',
    fetcher: mockFetcher,
  };

  describe('online mode', () => {
    beforeEach(() => {
      (SyncService.isOnline as jest.Mock).mockResolvedValue(true);
    });

    it('should fetch data online and cache it', async () => {
      const mockData = { items: [1, 2, 3] };
      mockFetcher.mockResolvedValue(mockData);

      const { result } = renderHook(() => useOfflineQuery(defaultOptions));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.isOfflineData).toBe(false);
      expect(DatabaseService.saveOfflineData).toHaveBeenCalledWith('test_key', mockData);
    });

    it('should call onSuccess callback', async () => {
      const mockData = { items: [1, 2, 3] };
      const onSuccess = jest.fn();
      mockFetcher.mockResolvedValue(mockData);

      renderHook(() => useOfflineQuery({ ...defaultOptions, onSuccess }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockData);
      });
    });

    it('should fallback to cache when online fetch fails', async () => {
      const cachedData = { cached: true };
      mockFetcher.mockRejectedValue(new Error('Network error'));
      (DatabaseService.getOfflineData as jest.Mock).mockResolvedValue(cachedData);

      const { result } = renderHook(() => useOfflineQuery(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(cachedData);
      expect(result.current.isOfflineData).toBe(true);
    });
  });

  describe('offline mode', () => {
    beforeEach(() => {
      (SyncService.isOnline as jest.Mock).mockResolvedValue(false);
    });

    it('should load data from cache when offline', async () => {
      const cachedData = { offline: true };
      (DatabaseService.getOfflineData as jest.Mock).mockResolvedValue(cachedData);

      const { result } = renderHook(() => useOfflineQuery(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(cachedData);
      expect(result.current.isOfflineData).toBe(true);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('should set error when no cache available offline', async () => {
      (DatabaseService.getOfflineData as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useOfflineQuery(defaultOptions));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });
  });

  describe('enabled option', () => {
    it('should not fetch when enabled is false', async () => {
      (SyncService.isOnline as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useOfflineQuery({ ...defaultOptions, enabled: false })
      );

      // Should not be loading since fetch is disabled
      expect(result.current.isLoading).toBe(false);
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      (SyncService.isOnline as jest.Mock).mockResolvedValue(true);
      const mockData1 = { version: 1 };
      const mockData2 = { version: 2 };
      mockFetcher.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() => useOfflineQuery(defaultOptions));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });
    });
  });
});
