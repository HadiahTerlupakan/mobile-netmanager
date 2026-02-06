import { LocationTrackingService } from '@/services/LocationTrackingService';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import * as SecureStore from 'expo-secure-store';
import { Storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import api from '@/services/api';

// Mock dependencies
jest.mock('expo-location');
jest.mock('expo-task-manager');
jest.mock('expo-battery');
jest.mock('expo-secure-store');
jest.mock('@/utils/storage');
jest.mock('@/utils/logger');
jest.mock('@/services/api');

describe('LocationTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startTracking', () => {
    it('should start tracking when permissions are granted', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
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
          timeInterval: 5 * 60 * 1000, // 5 mins for good battery
        })
      );
      expect(Storage.setItem).toHaveBeenCalledWith('@location_tracking_enabled', 'true');
    });

    it('should use lower frequency for low battery', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
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
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

      const result = await LocationTrackingService.startTracking();

      expect(result).toBe(false);
      expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
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

    it('should save to pending if no token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (Storage.getItem as jest.Mock).mockReturnValue(null); // No existing pending

      const result = await LocationTrackingService.sendLocation(mockLocationData);

      expect(result).toBe(true);
      expect(api.post).not.toHaveBeenCalled();
      expect(Storage.setItem).toHaveBeenCalledWith(
        '@pending_locations',
        expect.stringContaining(JSON.stringify([mockLocationData]).slice(1, -1)) // Check it contains the data
      );
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
