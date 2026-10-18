import * as Location from 'expo-location';
import { Platform } from 'react-native';

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

const FOREGROUND_SERVICE = {
  notificationTitle: 'RADPRO sedang melacak lokasi Anda',
  notificationBody: 'Pelacakan aktif selama jam kerja. Berhenti otomatis saat check-out.',
  notificationColor: '#0a46aa',
};

/**
 * Jarak minimum sebelum OS mengirim titik. Android baru mengirim bila HP
 * berpindah sejauh ini, sehingga karyawan yang diam tidak pernah mengirim
 * heartbeat dan posisinya basi berjam-jam. Dengan 0, titik datang tiap
 * `timeInterval` dan penyaringan jarak dilakukan di task. iOS tidak mengenal
 * `timeInterval`, jadi jaraknya dipertahankan.
 */
function jarakMinimumOs(config: LocationTrackingConfig): number {
  return Platform.OS === 'android' ? 0 : config.distanceInterval;
}

/**
 * Opsi `startLocationUpdatesAsync` untuk satu konfigurasi. Satu sumber untuk
 * memulai tracking dan menyesuaikannya: dulu jalur "sudah berjalan" memakai
 * `pausesUpdatesAutomatically: true`, sehingga setiap aplikasi dibuka iOS
 * beralih ke mode yang berhenti melacak saat HP diam.
 */
export function buildLocationTaskOptions(config: LocationTrackingConfig): Location.LocationTaskOptions {
  return {
    accuracy: config.accuracy,
    timeInterval: config.timeInterval,
    distanceInterval: jarakMinimumOs(config),
    // Titik yang ditahan lebih lama dari interval membuat peta tertinggal sejauh itu.
    deferredUpdatesInterval: config.timeInterval,
    foregroundService: FOREGROUND_SERVICE,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.OtherNavigation,
  };
}

/** Kunci pembanding untuk tahu apakah konfigurasi yang terpasang perlu diganti. */
export function kunciKonfigurasi(config: LocationTrackingConfig): string {
  return `${config.timeInterval}:${config.distanceInterval}:${config.accuracy}`;
}
