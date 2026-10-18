import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';

import { LocationTrackingService } from '../../src/services/LocationTrackingService';
import { Storage } from '../../src/utils/storage';
import api from '../../src/services/api';

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

import { TokenService } from '@/services/TokenService';

type TaskBody = { data?: { locations: Location.LocationObject[] }; error: null };

// Diambil sebelum clearAllMocks pertama: modul hanya mendefinisikan task sekali.
const jalankanTask = (TaskManager.defineTask as jest.Mock).mock.calls[0][1] as (
  body: TaskBody,
) => Promise<void>;

/** Storage palsu yang benar-benar menyimpan, agar antrean bisa diperiksa. */
function pasangStorage(awal: Record<string, string> = {}) {
  const isi: Record<string, string> = { ...awal };
  (Storage.getItem as jest.Mock).mockImplementation(async (k: string) => isi[k] ?? null);
  (Storage.setItem as jest.Mock).mockImplementation(async (k: string, v: string) => {
    isi[k] = v;
  });
  (Storage.removeItem as jest.Mock).mockImplementation(async (k: string) => {
    delete isi[k];
  });
  return isi;
}

const titikAntre = (menit: number) => ({
  latitude: menit,
  longitude: 106.8,
  accuracy: 10,
  altitude: null,
  speed: 0,
  heading: 0,
  recordedAt: new Date(Date.UTC(2026, 3, 10, 7, menit)).toISOString(),
});

const titikOs = (timestamp: number, latitude: number): Location.LocationObject => ({
  timestamp,
  coords: {
    latitude,
    longitude: 106.8,
    accuracy: 10,
    altitude: 0,
    speed: 0,
    heading: 0,
    altitudeAccuracy: null,
  },
});

describe('antrean lokasi offline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TokenService.setToken(null);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
    (Location.getForegroundPermissionsAsync as jest.Mock) = jest.fn().mockResolvedValue({ status: 'granted' });
  });

  it('dikirim begitu satu titik live berhasil terkirim', async () => {
    const isi = pasangStorage({ '@pending_locations': JSON.stringify([titikAntre(1), titikAntre(2)]) });
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await LocationTrackingService.sendLocation(titikAntre(3));

    expect(api.post).toHaveBeenLastCalledWith(
      '/api/mobile/location',
      { locations: [titikAntre(1), titikAntre(2)] },
      expect.anything(),
    );
    expect(isi['@pending_locations']).toBeUndefined();
  });

  it('tetap disimpan bila gagal jaringan, untuk dicoba lagi', async () => {
    const isi = pasangStorage({ '@pending_locations': JSON.stringify([titikAntre(1)]) });
    (api.post as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const terkirim = await LocationTrackingService.syncPendingLocations();

    expect(terkirim).toBe(0);
    expect(JSON.parse(isi['@pending_locations'])).toEqual([titikAntre(1)]);
  });

  it('dibuang bila server menolaknya permanen, agar tidak macet selamanya', async () => {
    const isi = pasangStorage({ '@pending_locations': JSON.stringify([titikAntre(1)]) });
    (api.post as jest.Mock).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: {} } });

    await LocationTrackingService.syncPendingLocations();

    expect(isi['@pending_locations']).toBeUndefined();
  });

  it('tetap disimpan bila ditolak proxy (403), karena isinya belum tentu salah', async () => {
    const isi = pasangStorage({ '@pending_locations': JSON.stringify([titikAntre(1)]) });
    (api.post as jest.Mock).mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {} } });

    await LocationTrackingService.syncPendingLocations();

    expect(JSON.parse(isi['@pending_locations'])).toEqual([titikAntre(1)]);
  });

  it('titik yang masuk selama sinkron berjalan tidak ikut terhapus', async () => {
    const isi = pasangStorage({ '@pending_locations': JSON.stringify([titikAntre(1)]) });
    (api.post as jest.Mock).mockImplementation(async () => {
      isi['@pending_locations'] = JSON.stringify([titikAntre(1), titikAntre(2)]);
      return { data: { success: true } };
    });

    await LocationTrackingService.syncPendingLocations();

    expect(JSON.parse(isi['@pending_locations'])).toEqual([titikAntre(2)]);
  });
});

describe('task background', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TokenService.setToken(null);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
    (Location.getForegroundPermissionsAsync as jest.Mock) = jest.fn().mockResolvedValue({ status: 'granted' });
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
  });

  it('mengirim titik terbaru dari batch, titik lama masuk antrean', async () => {
    const isi = pasangStorage({ '@location_tracking_started_at': new Date().toISOString() });
    const sekarang = Date.now();

    await jalankanTask({
      data: { locations: [titikOs(sekarang - 20 * 60000, -6.1), titikOs(sekarang, -6.3)] },
      error: null,
    });

    const [, kirimanLive] = (api.post as jest.Mock).mock.calls[0];
    expect(kirimanLive.latitude).toBe(-6.3);
    expect(kirimanLive.batteryLevel).toBe(0.8);
    expect(JSON.parse(isi['@last_sent_location']).latitude).toBe(-6.3);
    // Titik lama ikut terkirim lewat sinkron antrean sesudah kiriman live sukses.
    expect((api.post as jest.Mock).mock.calls[1][1]).toEqual({
      locations: [expect.objectContaining({ latitude: -6.1 })],
    });
  });

  it('menyesuaikan interval saat karyawan mulai bergerak', async () => {
    pasangStorage({
      '@location_tracking_started_at': new Date().toISOString(),
      '@location_tracking_config': `${10 * 60000}:100:3`,
    });
    const bergerak = titikOs(Date.now(), -6.3);
    bergerak.coords.speed = 5;

    await jalankanTask({ data: { locations: [bergerak] }, error: null });

    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeInterval: 5 * 60000 }),
    );
  });

  it('tidak menyalakan lagi tracking yang dihentikan server', async () => {
    pasangStorage({
      '@location_tracking_started_at': new Date().toISOString(),
      '@location_tracking_config': `${10 * 60000}:100:3`,
    });
    (api.post as jest.Mock).mockResolvedValue({ data: { data: { shouldStopTracking: true } } });
    const bergerak = titikOs(Date.now(), -6.3);
    bergerak.coords.speed = 5;

    await jalankanTask({ data: { locations: [bergerak] }, error: null });

    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('mematikan lagi tracking yang dihentikan selagi interval disesuaikan', async () => {
    const isi = pasangStorage({
      '@location_tracking_started_at': new Date().toISOString(),
      '@location_tracking_config': `${10 * 60000}:100:3`,
    });
    // Check-out tepat saat pendaftaran ulang berjalan.
    (Location.startLocationUpdatesAsync as jest.Mock).mockImplementation(async () => {
      delete isi['@location_tracking_config'];
    });
    const bergerak = titikOs(Date.now(), -6.3);
    bergerak.coords.speed = 5;

    await jalankanTask({ data: { locations: [bergerak] }, error: null });

    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
    expect(isi['@location_tracking_config']).toBeUndefined();
  });
});

