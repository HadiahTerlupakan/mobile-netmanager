import { LocationTrackingService } from '../../src/services/LocationTrackingService';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as SecureStore from 'expo-secure-store';
import { Storage } from '../../src/utils/storage';
import api from '../../src/services/api';
import {
  requestForegroundLocationWithDisclosure,
  ensureDisclosureBeforeBackground,
} from '../../src/utils/locationDisclosure';

// Mock dependencies
jest.mock('expo-location');
jest.mock('expo-task-manager');
jest.mock('expo-battery');
jest.mock('expo-secure-store');
jest.mock('@/utils/storage');
jest.mock('@/utils/logger');
jest.mock('@/services/api');
jest.mock('../../src/utils/locationDisclosure');
jest.mock('@/services/RefreshTokenService', () => ({
  RefreshTokenService: { refreshAccessToken: jest.fn() },
}));

import { RefreshTokenService } from '@/services/RefreshTokenService';
import { TokenService } from '@/services/TokenService';

const mockRefresh = RefreshTokenService.refreshAccessToken as jest.Mock;
const galat401 = { isAxiosError: true, response: { status: 401, data: {} } };

const mockRequestForeground = requestForegroundLocationWithDisclosure as jest.Mock;
const mockEnsureBackground = ensureDisclosureBeforeBackground as jest.Mock;

describe('LocationTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TokenService.setToken(null);
    jest.spyOn(global, 'setTimeout').mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);
    (Storage.getItem as jest.Mock).mockResolvedValue(null);
    // Default: gerbang disclosure mengizinkan & memberi foreground granted
    mockRequestForeground.mockResolvedValue({ status: 'granted' });
    mockEnsureBackground.mockResolvedValue(true);
    // Background permission already granted by default
    (Location as any).getBackgroundPermissionsAsync =
      (Location as any).getBackgroundPermissionsAsync ?? jest.fn();
    ((Location as any).getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('startTracking', () => {
    it('should start tracking when permissions are granted', async () => {
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.8); // 80% battery
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 1, longitude: 2, accuracy: 10, altitude: 0, speed: 0, heading: 0 },
        timestamp: Date.now(),
      });

      const result = await LocationTrackingService.startTracking();

      expect(result).toBe(true);
      expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10 * 60 * 1000,
        })
      );
      expect(Storage.setItem).toHaveBeenCalledWith('@location_tracking_enabled', 'true');
      expect(Storage.setItem).toHaveBeenCalledWith('@location_tracking_started_at', expect.any(String));
    });

    it('should use lower frequency for low battery', async () => {
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.15); // 15% battery
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

      await LocationTrackingService.startTracking();

      expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeInterval: 30 * 60 * 1000, // 30 mins for low battery
        })
      );
    });

    it('should return false if foreground permission denied', async () => {
      mockRequestForeground.mockResolvedValue({ status: 'denied' });

      const result = await LocationTrackingService.startTracking();

      expect(result).toBe(false);
      expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('should request background disclosure when background not yet granted', async () => {
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      mockEnsureBackground.mockResolvedValue(true);
      (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.8);
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

      await LocationTrackingService.startTracking();

      expect(mockEnsureBackground).toHaveBeenCalled();
      expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should abort tracking when user rejects background disclosure', async () => {
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      (Location.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      mockEnsureBackground.mockResolvedValue(false);

      const result = await LocationTrackingService.startTracking();

      expect(result).toBe(false);
      expect(mockEnsureBackground).toHaveBeenCalled();
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
      expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('should abort when foreground disclosure is rejected', async () => {
      // Gerbang foreground mengembalikan denied saat user menolak disclosure
      mockRequestForeground.mockResolvedValue({ status: 'denied' });

      const result = await LocationTrackingService.startTracking();

      expect(result).toBe(false);
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('stopTracking', () => {
    it('should stop updates if currently tracking', async () => {
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      await LocationTrackingService.stopTracking();

      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
      expect(Storage.setItem).toHaveBeenCalledWith('@location_tracking_enabled', 'false');
      expect(Storage.removeItem).toHaveBeenCalledWith('@last_sent_location');
    });

    it('should do nothing if not tracking', async () => {
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

      await LocationTrackingService.stopTracking();

      expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    });
  });

  describe('hentikanBilaLewatBatas', () => {
    const SEKARANG = new Date('2026-10-02T20:00:00.000Z');

    it('sesi tanpa catatan waktu mulai (dari versi lama) dicatat sekarang, tidak dihentikan', async () => {
      (Storage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(LocationTrackingService.hentikanBilaLewatBatas(SEKARANG)).resolves.toBe(false);
      expect(Storage.setItem).toHaveBeenCalledWith('@location_tracking_started_at', SEKARANG.toISOString());
    });

    it('lebih dari 16 jam sejak mulai → dihentikan (lupa check-out sambil offline)', async () => {
      (Storage.getItem as jest.Mock).mockResolvedValue('2026-10-02T03:00:00.000Z');
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      await expect(LocationTrackingService.hentikanBilaLewatBatas(SEKARANG)).resolves.toBe(true);
      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
      expect(Storage.removeItem).toHaveBeenCalledWith('@location_tracking_started_at');
    });

    it('masih dalam jam kerja → tetap jalan', async () => {
      (Storage.getItem as jest.Mock).mockResolvedValue('2026-10-02T08:00:00.000Z');

      await expect(LocationTrackingService.hentikanBilaLewatBatas(SEKARANG)).resolves.toBe(false);
      expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    });
  });

  describe('sendLocation', () => {
    const mockLocationData = {
      latitude: 1.23,
      longitude: 4.56,
      accuracy: 10,
      altitude: 100,
      speed: 0,
      heading: 0,
      recordedAt: new Date().toISOString(),
    };

    it('should send location to API if token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid-token');
      (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      const result = await LocationTrackingService.sendLocation(mockLocationData);

      expect(result).toBe(true);
      expect(api.post).toHaveBeenCalledWith(
        '/api/mobile/location',
        mockLocationData,
        expect.anything()
      );
    });

    it('tanpa sesi login (sudah logout) menghentikan tracking, tidak menumpuk antrean', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      const result = await LocationTrackingService.sendLocation(mockLocationData);

      expect(result).toBe(false);
      expect(api.post).not.toHaveBeenCalled();
      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
      expect(Storage.setItem).not.toHaveBeenCalledWith('@pending_locations', expect.anything());
    });

    it('app tertutup (token di memori kosong) memakai token tersimpan agar request terautentikasi', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token-tersimpan');
      (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      await expect(LocationTrackingService.sendLocation(mockLocationData)).resolves.toBe(true);
      expect(TokenService.getToken()).toBe('token-tersimpan');
    });

    it('token kedaluwarsa (401) → refresh sekali lalu kirim ulang, sehingga perintah berhenti dari server tetap sampai', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token-lama');
      mockRefresh.mockResolvedValue('token-baru');
      (api.post as jest.Mock)
        .mockRejectedValueOnce(galat401)
        .mockResolvedValueOnce({ data: { data: { shouldStopTracking: true }, shouldStopTracking: true } });
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      const result = await LocationTrackingService.sendLocation(mockLocationData);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledTimes(2);
      expect(result).toBe(false);
      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
    });

    it('sesi tidak bisa diperbarui (refresh gagal) → tracking dihentikan, bukan jalan selamanya', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token-lama');
      mockRefresh.mockResolvedValue(null);
      (api.post as jest.Mock).mockRejectedValue(galat401);
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      await expect(LocationTrackingService.sendLocation(mockLocationData)).resolves.toBe(false);
      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
    });

    it('gagal jaringan (offline) tetap disimpan ke antrean dan tracking jalan', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
      (api.post as jest.Mock).mockRejectedValue(new Error('No Internet connection'));

      await expect(LocationTrackingService.sendLocation(mockLocationData)).resolves.toBe(true);
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(Storage.setItem).toHaveBeenCalledWith('@pending_locations', expect.any(String));
      expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    // Bentuk balasan NYATA dari server: `apiSuccess` membungkus muatan di
    // dalam `data`, sehingga axios memberi
    // `response.data = { success, data: { shouldStopTracking } }`.
    // Test lama memalsukan bentuk datar yang tidak pernah dikirim server.
    it('berhenti saat server bilang belum check-in (bentuk amplop asli)', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid-token');
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { shouldStopTracking: true },
          message: 'User belum melakukan check-in',
        },
      });
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      const result = await LocationTrackingService.sendLocation(mockLocationData);

      expect(result).toBe(false);
      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
    });

    it('should stop tracking if server requests it', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid-token');
      const error = {
        isAxiosError: true,
        response: {
          data: { shouldStopTracking: true }
        }
      };
      (api.post as jest.Mock).mockRejectedValue(error);
      (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

      const result = await LocationTrackingService.sendLocation(mockLocationData);

      expect(result).toBe(false);
      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
    });
  });
});
