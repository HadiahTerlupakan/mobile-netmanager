import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockInitDatabase = jest.fn<() => Promise<void>>();
jest.mock('@/services/DatabaseService', () => ({
  DatabaseService: { initDatabase: () => mockInitDatabase() },
}));

const mockSapu = jest.fn<() => Promise<number>>();
jest.mock('@/services/sapuFotoOffline', () => ({
  sapuFotoOfflineYatim: () => mockSapu(),
}));

jest.mock('@/services/ForegroundNotificationService', () => ({
  ensureForegroundNotificationChannel: jest.fn(async () => undefined),
}));
jest.mock('@/services/NetworkStateService', () => ({
  networkStateService: { initialize: jest.fn(), dispose: jest.fn() },
}));
jest.mock('@/services/PerformanceMonitor', () => ({
  performanceMonitor: { start: jest.fn(), stop: jest.fn() },
}));
jest.mock('@/services/SyncService', () => ({
  SyncService: { startMonitoring: jest.fn(), stopMonitoring: jest.fn() },
}));
jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/services/ErrorReportingService', () => ({
  errorReportingService: { captureException: jest.fn() },
}));

import { useAppInitialization } from '@/hooks/useAppInitialization';

beforeEach(() => {
  jest.clearAllMocks();
  mockInitDatabase.mockResolvedValue(undefined);
  mockSapu.mockResolvedValue(0);
});

describe('useAppInitialization', () => {
  it('menyapu foto offline yatim sekali, setelah database siap', async () => {
    const { unmount } = renderHook(() => useAppInitialization(true));

    await waitFor(() => expect(mockSapu).toHaveBeenCalledWith());
    expect(mockSapu).toHaveBeenCalledTimes(1);
    expect(mockInitDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockSapu.mock.invocationCallOrder[0],
    );
    unmount();
  });

  it('tidak menyapu bila database gagal diinisialisasi', async () => {
    mockInitDatabase.mockRejectedValue(new Error('disk penuh'));
    const { errorReportingService } = require('@/services/ErrorReportingService');

    const { unmount } = renderHook(() => useAppInitialization(true));

    await waitFor(() => expect(errorReportingService.captureException).toHaveBeenCalledWith(
      new Error('disk penuh'),
      { source: 'root.initServices' },
    ));
    expect(mockSapu).not.toHaveBeenCalled();
    unmount();
  });
  // Review akhir M8: janji sweep tidak boleh menjadi unhandled rejection.
  it('sweep yang gagal dicatat sebagai peringatan dan inisialisasi tetap berlanjut', async () => {
    const galat = new Error('berkas terkunci');
    mockSapu.mockRejectedValue(galat);
    const { logger } = require('@/utils/logger');
    const { ensureForegroundNotificationChannel } = require('@/services/ForegroundNotificationService');

    const { unmount } = renderHook(() => useAppInitialization(true));

    await waitFor(() => expect(logger.warn).toHaveBeenCalledWith('[Init] Sweep foto gagal', galat));
    expect(ensureForegroundNotificationChannel).toHaveBeenCalledWith();
    unmount();
  });
});
