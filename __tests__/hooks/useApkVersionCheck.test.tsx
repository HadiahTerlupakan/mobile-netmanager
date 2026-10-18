import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, DeviceEventEmitter } from 'react-native';

const mockCheckApkVersion = jest.fn<() => Promise<unknown>>();

jest.mock('@/services/apkVersionService', () => ({
  checkApkVersion: () => mockCheckApkVersion(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));
jest.mock('@/utils/logger');

import { Events } from '@/constants/Events';
import { useApkVersionCheck } from '@/hooks/useApkVersionCheck';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.netmanager.mobile';

describe('useApkVersionCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  });

  it('langsung menampilkan update wajib begitu server menolak versi aplikasi', async () => {
    mockCheckApkVersion.mockResolvedValueOnce({
      updateAvailable: false,
      isForceUpdate: false,
      currentVersion: '1.0.9',
      latestVersion: null,
      contactAdmin: null,
    });
    const { result } = renderHook(() => useApkVersionCheck());
    await waitFor(() => expect(mockCheckApkVersion).toHaveBeenCalledTimes(1));

    mockCheckApkVersion.mockResolvedValueOnce({
      updateAvailable: true,
      isForceUpdate: true,
      currentVersion: '1.0.9',
      latestVersion: { version: '1.0.10', versionCode: 50, downloadUrl: PLAY_URL },
      contactAdmin: null,
    });
    act(() => {
      DeviceEventEmitter.emit(Events.APP_VERSION_UNSUPPORTED, { success: false });
    });

    await waitFor(() => expect(result.current.isForceUpdate).toBe(true));
    expect(mockCheckApkVersion).toHaveBeenCalledTimes(2);
  });
});
