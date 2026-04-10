const mockGetTenantUrl = jest.fn(() => 'https://tenant.example.com');

jest.mock('@/services/TenantService', () => ({
  TenantService: {
    getTenantUrl: mockGetTenantUrl,
  },
}));

const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

jest.mock('@/native/ApkInstaller', () => ({
  checkInstallPermission: jest.fn(),
  installApkNative: jest.fn(),
  openInstallSettings: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  getContentUriAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
}));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'android',
  },
}));

describe('AppVersionService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_APP_VARIANT: 'staging',
    };
    jest.doMock('expo', () => ({
      isRunningInExpoGo: () => false,
    }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          hostUri: '192.168.18.86:8081',
        },
        executionEnvironment: 'standalone',
      },
    }));
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const loadAppVersionService = () => {
    let appVersionService: typeof import('@/services/AppVersionService').appVersionService;

    jest.isolateModules(() => {
      ({ appVersionService } = require('@/services/AppVersionService'));
    });

    return appVersionService!;
  };

  it('returns a structured error when the update endpoint returns a non-JSON error response', async () => {
    const appVersionService = loadAppVersionService();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new Error('Unexpected token < in JSON')),
      text: jest.fn().mockResolvedValue('Maintenance mode'),
    });

    await expect(appVersionService.checkForUpdate(42)).resolves.toEqual(
      expect.objectContaining({
        success: false,
        updateAvailable: false,
        error: 'Maintenance mode',
      })
    );
  });

  it('logs reportVersion failures when the backend returns a non-OK status', async () => {
    const appVersionService = loadAppVersionService();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: 'Failed to record version' }),
      text: jest.fn().mockResolvedValue('Failed to record version'),
    });

    await appVersionService.reportVersion(42, '1.0.0', 'token-123');

    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('returns a non-fatal timeout error and avoids error logging when the update request is aborted', async () => {
    const appVersionService = loadAppVersionService();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Aborted'));

    await expect(appVersionService.checkForUpdate(42)).resolves.toEqual(
      expect.objectContaining({
        success: false,
        updateAvailable: false,
        error: 'Request timeout saat memeriksa update aplikasi',
      })
    );
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Check update timeout:',
      expect.any(Error)
    );
    expect(mockLoggerError).not.toHaveBeenCalled();
  });
});
