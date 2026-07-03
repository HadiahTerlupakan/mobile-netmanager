jest.useFakeTimers();

const mockSetToken = jest.fn();
const mockGetExpiry = jest.fn(() => null as number | null);
jest.mock('@/services/TokenService', () => ({
  TokenService: {
    setToken: mockSetToken,
    getToken: jest.fn(() => null),
    getExpiry: mockGetExpiry,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: { auth: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/utils/storage', () => ({
  SecureStorage: {
    getItem: jest.fn(),
    setItemStrict: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/TenantService', () => ({
  TenantService: { getTenantUrl: jest.fn(() => 'https://test.example.com') },
}));

jest.mock('@/constants/appVersion', () => ({
  CURRENT_VERSION_CODE_LABEL: '1',
  CURRENT_VERSION_NAME: '1.0.0',
}));

jest.mock('@/constants/Events', () => ({
  Events: { APP_VERSION_UNSUPPORTED: 'app:version_unsupported' },
}));

jest.mock('react-native', () => ({
  DeviceEventEmitter: { emit: jest.fn() },
}));

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: mockAxiosPost },
  isAxiosError: (e: unknown) => Boolean((e as { isAxiosError?: boolean })?.isAxiosError),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('RefreshTokenService — proactive refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetModules();
  });

  it('does not schedule timer when token has no expiry', () => {
    mockGetExpiry.mockReturnValue(null as unknown as number);
    const { RefreshTokenService } = require('@/services/RefreshTokenService');
    RefreshTokenService.startProactiveRefresh('token-no-exp');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('schedules timer ~60s before token expiry', () => {
    const expiryMs = Date.now() + 300_000;
    mockGetExpiry.mockReturnValue(expiryMs as unknown as number);
    const { RefreshTokenService } = require('@/services/RefreshTokenService');

    RefreshTokenService.startProactiveRefresh('token-valid');
    expect(jest.getTimerCount()).toBe(1);
  });

  it('stopProactiveRefresh cancels the scheduled timer', () => {
    const expiryMs = Date.now() + 300_000;
    mockGetExpiry.mockReturnValue(expiryMs as unknown as number);
    const { RefreshTokenService } = require('@/services/RefreshTokenService');

    RefreshTokenService.startProactiveRefresh('token-valid');
    expect(jest.getTimerCount()).toBe(1);
    RefreshTokenService.stopProactiveRefresh();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('triggers refresh immediately when token is already near expiry', async () => {
    const expiryMs = Date.now() + 30_000;
    mockGetExpiry.mockReturnValue(expiryMs as unknown as number);

    const mockSecureStorage = require('@/utils/storage').SecureStorage;
    mockSecureStorage.getItem.mockResolvedValue('old-refresh-token');
    mockAxiosPost.mockResolvedValue({ data: { token: 'new-access-token', refreshToken: 'new-refresh-token' } });
    mockSecureStorage.setItemStrict.mockResolvedValue(undefined);

    const { RefreshTokenService } = require('@/services/RefreshTokenService');
    RefreshTokenService.startProactiveRefresh('token-near-expiry');

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/mobile/auth/refresh'),
      expect.objectContaining({ refreshToken: 'old-refresh-token' }),
      expect.any(Object),
    );
  });

  it('calling startProactiveRefresh twice replaces previous timer (no leak)', () => {
    const expiryMs = Date.now() + 300_000;
    mockGetExpiry.mockReturnValue(expiryMs as unknown as number);
    const { RefreshTokenService } = require('@/services/RefreshTokenService');

    RefreshTokenService.startProactiveRefresh('token-a');
    RefreshTokenService.startProactiveRefresh('token-b');

    expect(jest.getTimerCount()).toBe(1);
  });
});
