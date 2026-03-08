jest.useFakeTimers();

const mockApi = jest.fn();
const mockRequestUse = jest.fn();
const mockResponseUse = jest.fn();

let mockResponseErrorHandler: ((error: unknown) => Promise<unknown>) | undefined;

jest.mock('axios', () => {
  const create = jest.fn(() => {
    mockApi.interceptors = {
      request: {
        use: mockRequestUse,
      },
      response: {
        use: jest.fn((onSuccess, onError) => {
          mockResponseUse(onSuccess, onError);
          mockResponseErrorHandler = onError;
          return 0;
        }),
      },
    };

    return mockApi;
  });

  return {
    __esModule: true,
    default: {
      create,
    },
    AxiosError: class AxiosError extends Error {},
  };
});

const mockEmit = jest.fn();
jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: mockEmit,
  },
}));

const mockRefreshAccessToken = jest.fn();
jest.mock('@/services/RefreshTokenService', () => ({
  RefreshTokenService: {
    refreshAccessToken: mockRefreshAccessToken,
  },
}));

const mockGetToken = jest.fn(() => null);
jest.mock('@/services/TokenService', () => ({
  TokenService: {
    getToken: mockGetToken,
    setToken: jest.fn(),
  },
}));

jest.mock('@/services/TenantService', () => ({
  TenantService: {
    getTenantUrl: jest.fn(() => 'https://tenant.example.com'),
  },
}));

const mockStart = jest.fn();
const mockStop = jest.fn();
jest.mock('@/services/PerformanceMonitor', () => ({
  performanceMonitor: {
    start: mockStart,
    stop: mockStop,
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    auth: jest.fn(),
  },
}));

describe('api service interceptors', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockApi.mockReset();
    mockResponseErrorHandler = undefined;
  });

  const loadResponseErrorHandler = async () => {
    jest.isolateModules(() => {
      require('@/services/api');
    });
    expect(mockResponseErrorHandler).toBeDefined();
    return mockResponseErrorHandler!;
  };

  it('rejects unauthorized requests after refresh failure instead of hanging callers', async () => {
    jest.useRealTimers();
    const onError = await loadResponseErrorHandler();
    const error = {
      config: { url: '/api/mobile/me', headers: {}, method: 'get' },
      response: { status: 401 },
    };

    mockRefreshAccessToken.mockResolvedValue(null);

    await expect(
      Promise.race([
        onError(error),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timed-out')), 25)),
      ])
    ).rejects.toBe(error);
    expect(mockEmit).toHaveBeenCalledWith('auth:unauthorized');
    jest.useFakeTimers();
  });

  it('does not retry non-idempotent POST requests on timeout without an idempotency key', async () => {
    const onError = await loadResponseErrorHandler();
    const error = {
      config: { url: '/api/mobile/work-order', headers: {}, method: 'post' },
      code: 'ECONNABORTED',
    };

    const resultPromise = onError(error);
    jest.runAllTimers();

    await expect(resultPromise).rejects.toBe(error);
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('does not retry when the request explicitly disables retry behavior', async () => {
    const onError = await loadResponseErrorHandler();
    const error = {
      config: {
        url: '/api/mobile/sync/replay',
        headers: { 'Idempotency-Key': 'sync-123' },
        method: 'post',
        skipRetry: true,
      },
      code: 'ECONNABORTED',
    };

    const resultPromise = onError(error);
    jest.runAllTimers();

    await expect(resultPromise).rejects.toBe(error);
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('retries GET requests on timeout', async () => {
    const onError = await loadResponseErrorHandler();
    const retriedResponse = { data: { ok: true } };
    const error = {
      config: { url: '/api/mobile/dashboard', headers: {}, method: 'get' },
      code: 'ECONNABORTED',
    };

    mockApi.mockResolvedValueOnce(retriedResponse);

    const resultPromise = onError(error);
    jest.advanceTimersByTime(1000);

    await expect(resultPromise).resolves.toBe(retriedResponse);
    expect(mockApi).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/mobile/dashboard' }));
  });
});
