import { act, renderHook } from '@testing-library/react-native';
import axios from 'axios';
import { useOfflineMutation } from '../../hooks/useOfflineMutation';
import { DatabaseService } from '../../services/DatabaseService';
import { SyncService } from '../../services/SyncService';

// Mock showMutationAlert
jest.mock('../../hooks/useOfflineMutation', () => {
  const actual = jest.requireActual('../../hooks/useOfflineMutation');
  return {
    ...actual,
    showMutationAlert: jest.fn(),
  };
});

// Mock modules
jest.mock('../../services/SyncService', () => ({
  SyncService: {
    isOnline: jest.fn(),
  }
}));

jest.mock('../../services/DatabaseService', () => ({
  DatabaseService: {
    addToQueue: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' })
}));

jest.mock('axios');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useOfflineMutation', () => {
  const defaultOptions = {
    url: '/api/test',
    method: 'POST' as const,
    onSuccess: jest.fn(),
    onError: jest.fn(),
    silent: true, // Skip Alert in tests
  };

  describe('online mode', () => {
    beforeEach(() => {
      (SyncService.isOnline as jest.Mock).mockResolvedValue(true);
    });

    it('should submit directly when online', async () => {
      const responseData = { success: true, id: 1 };
      (axios as unknown as jest.Mock).mockResolvedValue({ status: 200, data: responseData });

      const { result } = renderHook(() => useOfflineMutation());
      
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.mutate({ name: 'Test' }, defaultOptions);
      });

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({ name: 'Test' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      }));
      
      expect(defaultOptions.onSuccess).toHaveBeenCalledWith(responseData, false);
    });

    it('should include location in payload', async () => {
      (axios as unknown as jest.Mock).mockResolvedValue({ status: 200, data: {} });

      const { result } = renderHook(() => useOfflineMutation());

      await act(async () => {
        await result.current.mutate({ data: 'test' }, defaultOptions);
      });

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          latitude: -6.2088,
          longitude: 106.8456
        })
      }));
    });

    it('should call onError on failure', async () => {
      const error = { response: { data: { error: 'Server error' } } };
      (axios as unknown as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useOfflineMutation());

      await act(async () => {
        await result.current.mutate({ data: 'test' }, defaultOptions);
      });

      expect(defaultOptions.onError).toHaveBeenCalledWith(error);
    });
  });

  describe('offline mode', () => {
    beforeEach(() => {
      (SyncService.isOnline as jest.Mock).mockResolvedValue(false);
    });

    it('should add to queue when offline', async () => {
      const { result } = renderHook(() => useOfflineMutation());

      await act(async () => {
        await result.current.mutate({ name: 'Test' }, defaultOptions);
      });

      expect(DatabaseService.addToQueue).toHaveBeenCalledWith(
        '/api/test',
        'POST',
        expect.objectContaining({ name: 'Test' }),
        expect.any(Object)
      );
      
      expect(defaultOptions.onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, offline: true }),
        true
      );
    });

    it('should not call axios when offline', async () => {
      const { result } = renderHook(() => useOfflineMutation());

      await act(async () => {
        await result.current.mutate({ data: 'test' }, defaultOptions);
      });

      expect(axios).not.toHaveBeenCalled();
    });
  });
});
