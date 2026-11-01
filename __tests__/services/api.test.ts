jest.useFakeTimers();

const mockApi = jest.fn() as any;
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

const mockShowToast = jest.fn();
jest.mock('@/utils/errorPresenter', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

type StatusJaringan = { isConnected: boolean | null; isInternetReachable: boolean | null };
let mockPendengarJaringan: ((status: StatusJaringan) => void) | undefined;
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (pendengar: (status: StatusJaringan) => void) => {
      mockPendengarJaringan = pendengar;
      return () => undefined;
    },
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

  /**
   * Pendaftaran token push berjalan di latar belakang. Endpoint-nya pernah
   * menolak token pelanggan dengan 401, dan penangan 401 mengeluarkan pelanggan
   * dari aplikasi beberapa detik setelah login. Penolakan seperti itu bukan
   * bukti sesinya berakhir: refresh dan coba ulang tetap dilakukan, tetapi
   * permintaan itu tidak pernah menjadi alasan sesi diakhiri.
   */
  describe('permintaan latar belakang yang tidak boleh mengakhiri sesi', () => {
    const configLatarBelakang = () => ({
      url: '/api/mobile/fcm-token',
      headers: {} as Record<string, string>,
      method: 'post',
      skipErrorToast: true,
      skipSignOutOnUnauthorized: true,
    });

    const tolakCobaUlang = (onError: (error: unknown) => Promise<unknown>) =>
      mockApi.mockImplementation((retryConfig: unknown) =>
        onError({ config: retryConfig, response: { status: 401 } }),
      );

    it('401 tetap memicu refresh dan coba ulang, tetapi penolakan sesudahnya tidak mengeluarkan pengguna', async () => {
      const onError = await loadResponseErrorHandler();
      mockRefreshAccessToken.mockResolvedValue('token-baru');
      tolakCobaUlang(onError);

      await expect(
        onError({ config: configLatarBelakang(), response: { status: 401 } }),
      ).rejects.toBeDefined();

      expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
      expect(mockApi).toHaveBeenCalledWith(
        expect.objectContaining({
          _isRetryAfterRefresh: true,
          headers: { Authorization: 'Bearer token-baru' },
        }),
      );
      expect(mockEmit).not.toHaveBeenCalledWith('auth:unauthorized');
    });

    it('refresh yang gagal pun tidak mengeluarkan pengguna dari permintaan latar belakang', async () => {
      const onError = await loadResponseErrorHandler();
      mockRefreshAccessToken.mockResolvedValue(null);
      const error = { config: configLatarBelakang(), response: { status: 401 } };

      await expect(onError(error)).rejects.toBe(error);
      expect(mockEmit).not.toHaveBeenCalledWith('auth:unauthorized');
    });

    it('permintaan biasa tetap mengeluarkan pengguna bila 401 bertahan setelah refresh', async () => {
      const onError = await loadResponseErrorHandler();
      mockRefreshAccessToken.mockResolvedValue('token-baru');
      tolakCobaUlang(onError);
      const { skipSignOutOnUnauthorized: _diabaikan, ...configBiasa } = configLatarBelakang();

      await expect(
        onError({ config: configBiasa, response: { status: 401 } }),
      ).rejects.toBeDefined();
      expect(mockEmit).toHaveBeenCalledWith('auth:unauthorized');
    });
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

  describe('toast koneksi saat perangkat offline', () => {
    const OFFLINE: StatusJaringan = { isConnected: true, isInternetReachable: false };

    /** Interceptor dan peredam galat dari registri modul yang sama, dalam keadaan offline. */
    const loadSaatOffline = () => {
      jest.isolateModules(() => {
        require('@/services/api');
        require('@/services/redamGalatOtomatis').pantauJaringanUntukGalatOtomatis();
      });
      if (!mockResponseErrorHandler || !mockPendengarJaringan) throw new Error('Interceptor atau NetInfo belum siap');
      mockPendengarJaringan(OFFLINE);
      return mockResponseErrorHandler;
    };

    const gagalTanpaRespons = (method: string, url: string) => ({
      config: { url, headers: {}, method, skipRetry: true },
      code: 'ERR_NETWORK',
    });

    beforeEach(() => {
      mockPendengarJaringan = undefined;
    });

    it('GET yang gagal tanpa respons: tanpa "Masalah Koneksi" per permintaan, cukup satu pemberitahuan', async () => {
      const onError = loadSaatOffline();

      for (const url of ['/api/mobile/dashboard', '/api/mobile/notifications', '/api/mobile/work-orders']) {
        const error = gagalTanpaRespons('get', url);
        await expect(onError(error)).rejects.toBe(error);
      }

      expect(mockShowToast.mock.calls.map(([jenis, judul]) => `${jenis}: ${judul}`)).toEqual([
        'warning: Tidak Ada Koneksi Internet',
      ]);
    });

    it('permintaan selain GET (mis. bayar tagihan) tetap memberi tahu pengguna', async () => {
      const onError = loadSaatOffline();
      const error = gagalTanpaRespons('post', '/api/customer/payments');

      await expect(onError(error)).rejects.toBe(error);

      expect(mockShowToast).toHaveBeenCalledWith('error', 'Masalah Koneksi', 'Mohon periksa koneksi internet Anda.');
    });
  });
});
