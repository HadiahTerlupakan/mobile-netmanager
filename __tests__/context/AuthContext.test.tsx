import { act, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { AuthContextType, AuthProvider, useAuth } from '../../src/context/AuthContext';
import { DatabaseService } from '@/services/DatabaseService';
import { RefreshTokenService } from '@/services/RefreshTokenService';
import { TokenService } from '@/services/TokenService';

// Mock logger to suppress console output
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    auth: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock react-native APIs used in AuthContext
jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    emit: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((objs) => objs.ios),
  },
}));

// Mock push notification service
jest.mock('@/services/PushNotificationService', () => ({
  registerForPushNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationListeners: jest.fn(() => jest.fn()),
}));

jest.mock('@/services/RefreshTokenService', () => ({
  RefreshTokenService: {
    saveRefreshToken: jest.fn().mockResolvedValue(undefined),
    clearRefreshToken: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/TokenService', () => ({
  TokenService: {
    setToken: jest.fn(),
  },
}));

jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: {
    clearSessionData: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock axios and the api service
jest.mock('axios', () => {
  const mockAxios: any = {
    create: jest.fn(() => mockAxios),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } },
    isAxiosError: jest.fn(),
  };
  return mockAxios;
});

// Mock Config
jest.mock('@/constants/Config', () => ({
  Config: {
    API_URL: 'http://localhost:3000'
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// Simple test component that doesn't render anything
const TestConsumer = ({ onMount }: { onMount: (auth: AuthContextType) => void }) => {
  const auth = useAuth();
  React.useEffect(() => {
    onMount(auth);
  }, [auth, onMount]);
  return null;
};

describe('AuthContext', () => {
  describe('initial state', () => {
    it('should start in loading state', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      let authContext: AuthContextType | undefined;

      const { unmount } = render(
        <AuthProvider>
          <TestConsumer onMount={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      expect(authContext?.isLoading).toBe(true);

      await waitFor(() => {
        expect(authContext?.isLoading).toBe(false);
      });

      unmount();
    });

    it('should load stored session on mount', async () => {
      const storedUser = { id: '1', name: 'Test User', email: 'test@test.com', role: 'employee' };
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('stored-token')
        .mockResolvedValueOnce(JSON.stringify(storedUser));

      let authContext: AuthContextType | undefined;

      render(
        <AuthProvider>
          <TestConsumer onMount={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authContext?.isLoading).toBe(false);
      });

      expect(authContext?.token).toBe('stored-token');
      expect(authContext?.user).toEqual(storedUser);
    });
  });

  describe('signIn', () => {
    it('should save token to secure store', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      let authContext: AuthContextType | undefined;

      render(
        <AuthProvider>
          <TestConsumer onMount={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authContext?.isLoading).toBe(false);
      });

      const newUser = { id: '2', name: 'New User', email: 'new@test.com', role: 'admin' };

      await act(async () => {
        await authContext?.signIn('new-token', newUser);
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('session_token', 'new-token');
    });

    it('rolls back local session state when persistence fails mid-signIn', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string) => {
        if (key === 'user_data') {
          throw new Error('disk full');
        }
      });
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      let authContext: AuthContextType | undefined;

      render(
        <AuthProvider>
          <TestConsumer onMount={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authContext?.isLoading).toBe(false);
      });

      const newUser = { id: '2', name: 'New User', email: 'new@test.com', role: 'admin' };

      await act(async () => {
        await authContext?.signIn('new-token', newUser, 'refresh-token');
      });

      expect(TokenService.setToken).toHaveBeenLastCalledWith(null);
      expect(DatabaseService.clearSessionData).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
      expect(authContext?.token).toBe(null);
      expect(authContext?.user).toBe(null);
    });
  });

  describe('signOut', () => {
    it('should clear session from secure store', async () => {
      const storedUser = { id: '1', name: 'Test User', email: 'test@test.com', role: 'employee' };
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('stored-token')
        .mockResolvedValueOnce(JSON.stringify(storedUser));
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      let authContext: AuthContextType | undefined;

      render(
        <AuthProvider>
          <TestConsumer onMount={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authContext?.token).toBe('stored-token');
      });

      await act(async () => {
        await authContext?.signOut();
      });

      expect(DatabaseService.clearSessionData).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
    });

    it('still clears local session when refresh-token cleanup fails', async () => {
      const storedUser = { id: '1', name: 'Test User', email: 'test@test.com', role: 'employee' };
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('stored-token')
        .mockResolvedValueOnce(JSON.stringify(storedUser));
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      (RefreshTokenService.clearRefreshToken as jest.Mock).mockRejectedValueOnce(new Error('storage failure'));

      let authContext: AuthContextType | undefined;

      render(
        <AuthProvider>
          <TestConsumer onMount={(auth) => { authContext = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authContext?.token).toBe('stored-token');
      });

      await act(async () => {
        await authContext?.signOut({ skipApi: true });
      });

      expect(TokenService.setToken).toHaveBeenLastCalledWith(null);
      expect(DatabaseService.clearSessionData).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_data');
      expect(authContext?.token).toBe(null);
      expect(authContext?.user).toBe(null);
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestConsumer onMount={() => {}} />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      spy.mockRestore();
    });
  });
});
