import * as Location from 'expo-location';

/**
 * Konfigurasi tracking lokasi adaptif berbasis level baterai & pergerakan.
 * Dipisah dari LocationTrackingService (single responsibility: policy interval).
 * Fungsi murni → mudah diuji tanpa side-effect.
 */

export type LocationTrackingConfig = {
  timeInterval: number;
  distanceInterval: number;
  accuracy: Location.Accuracy;
};

const MINUTE_MS = 60 * 1000;

// Sentinel dari expo-battery saat level baterai tidak diketahui.
const BATTERY_UNKNOWN = -1;

// Ambang tier baterai.
const BATTERY_CRITICAL = 0.15;
const BATTERY_LOW = 0.30;
const BATTERY_MEDIUM = 0.50;

const isKnown = (batteryLevel: number) => batteryLevel !== BATTERY_UNKNOWN;

/** Pilih interval/akurasi tracking sesuai baterai & apakah sedang bergerak. */
export function getLocationConfig(
  batteryLevel: number,
  isMoving: boolean,
): LocationTrackingConfig {
  // Critical battery (<15%): Minimal tracking
  if (batteryLevel < BATTERY_CRITICAL && isKnown(batteryLevel)) {
    return { timeInterval: 60 * MINUTE_MS, distanceInterval: 500, accuracy: Location.Accuracy.Low };
  }

  // Low battery (<30%): Reduced tracking
  if (batteryLevel < BATTERY_LOW && isKnown(batteryLevel)) {
    return { timeInterval: 30 * MINUTE_MS, distanceInterval: 200, accuracy: Location.Accuracy.Balanced };
  }

  // Medium battery (<50%): Normal tracking
  if (batteryLevel < BATTERY_MEDIUM && isKnown(batteryLevel)) {
    return { timeInterval: 15 * MINUTE_MS, distanceInterval: 100, accuracy: Location.Accuracy.Balanced };
  }

  // Good battery: Active tracking when moving
  if (isMoving) {
    return { timeInterval: 5 * MINUTE_MS, distanceInterval: 50, accuracy: Location.Accuracy.High };
  }

  // Good battery but stationary: Reduced tracking
  return { timeInterval: 10 * MINUTE_MS, distanceInterval: 100, accuracy: Location.Accuracy.Balanced };
}
