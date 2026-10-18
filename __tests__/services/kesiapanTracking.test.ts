import * as Location from 'expo-location';

import {
  bisaDimintaLewatDialog,
  laporStatusTracking,
  mintaIzinTracking,
  periksaKesiapanTracking,
} from '../../src/services/kesiapanTracking';
import api from '../../src/services/api';
import { Storage } from '../../src/utils/storage';
import {
  ensureDisclosureBeforeBackground,
  requestForegroundLocationWithDisclosure,
} from '../../src/utils/locationDisclosure';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
}));
jest.mock('@/utils/storage');
jest.mock('@/utils/logger');
jest.mock('@/services/api');
jest.mock('../../src/utils/locationDisclosure', () => ({
  requestForegroundLocationWithDisclosure: jest.fn(),
  ensureDisclosureBeforeBackground: jest.fn(),
}));

const izin = (status: 'granted' | 'denied', canAskAgain = true) => ({ status, canAskAgain });

/** Keadaan HP yang bisa diubah oleh "dialog izin" tiruan di tiap test. */
function pasangHp(keadaan: { depan: 'granted' | 'denied'; latar: 'granted' | 'denied'; gps: boolean; bisaMintaLatar?: boolean }) {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockImplementation(async () => izin(keadaan.depan));
  (Location.getBackgroundPermissionsAsync as jest.Mock).mockImplementation(async () =>
    izin(keadaan.latar, keadaan.bisaMintaLatar ?? true),
  );
  (Location.hasServicesEnabledAsync as jest.Mock).mockImplementation(async () => keadaan.gps);
  return keadaan;
}

function pasangStorage() {
  const isi: Record<string, string> = {};
  (Storage.getItem as jest.Mock).mockImplementation(async (k: string) => isi[k] ?? null);
  (Storage.setItem as jest.Mock).mockImplementation(async (k: string, v: string) => {
    isi[k] = v;
  });
  return isi;
}

describe('periksaKesiapanTracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('siap bila GPS menyala dan izin lokasi sepanjang waktu', async () => {
    pasangHp({ depan: 'granted', latar: 'granted', gps: true });

    expect(await periksaKesiapanTracking()).toBeNull();
  });

  it('izin "saat aplikasi digunakan" saja belum cukup', async () => {
    pasangHp({ depan: 'granted', latar: 'denied', gps: true });

    expect(await periksaKesiapanTracking()).toBe('izin-latar');
  });

  it('izin lokasi yang ditolak didahulukan dari GPS mati', async () => {
    pasangHp({ depan: 'denied', latar: 'denied', gps: false });

    expect(await periksaKesiapanTracking()).toBe('izin-lokasi');
  });

  it('GPS mati terdeteksi walau izinnya lengkap', async () => {
    pasangHp({ depan: 'granted', latar: 'granted', gps: false });

    expect(await periksaKesiapanTracking()).toBe('gps-mati');
  });
});

describe('mintaIzinTracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('meminta izin latar belakang sesudah disclosure, lalu memeriksa ulang', async () => {
    const hp = pasangHp({ depan: 'granted', latar: 'denied', gps: true });
    (ensureDisclosureBeforeBackground as jest.Mock).mockResolvedValue(true);
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockImplementation(async () => {
      hp.latar = 'granted';
      return izin('granted');
    });

    expect(await mintaIzinTracking()).toBeNull();
    expect(ensureDisclosureBeforeBackground).toHaveBeenCalled();
  });

  it('tidak meminta izin OS bila disclosure ditolak', async () => {
    pasangHp({ depan: 'granted', latar: 'denied', gps: true });
    (ensureDisclosureBeforeBackground as jest.Mock).mockResolvedValue(false);

    expect(await mintaIzinTracking()).toBe('izin-latar');
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('tidak memunculkan dialog yang sudah diblokir OS', async () => {
    pasangHp({ depan: 'granted', latar: 'denied', gps: true, bisaMintaLatar: false });

    expect(await mintaIzinTracking()).toBe('izin-latar');
    expect(ensureDisclosureBeforeBackground).not.toHaveBeenCalled();
  });

  it('izin lokasi biasa diminta lewat gerbang disclosure', async () => {
    const hp = pasangHp({ depan: 'denied', latar: 'granted', gps: true });
    (requestForegroundLocationWithDisclosure as jest.Mock).mockImplementation(async () => {
      hp.depan = 'granted';
      return { status: 'granted' };
    });

    expect(await mintaIzinTracking()).toBeNull();
  });
});

describe('bisaDimintaLewatDialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('izin latar belakang mengikuti status blokir izin latar belakang', async () => {
    pasangHp({ depan: 'granted', latar: 'denied', gps: true, bisaMintaLatar: false });
    expect(await bisaDimintaLewatDialog('izin-latar')).toBe(false);

    pasangHp({ depan: 'granted', latar: 'denied', gps: true, bisaMintaLatar: true });
    expect(await bisaDimintaLewatDialog('izin-latar')).toBe(true);
  });

  it('GPS mati tidak punya dialog izin', async () => {
    pasangHp({ depan: 'granted', latar: 'granted', gps: false });

    expect(await bisaDimintaLewatDialog('gps-mati')).toBe(false);
  });
});

describe('laporStatusTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
  });

  it('melapor ke server sekali per perubahan status', async () => {
    pasangStorage();

    await laporStatusTracking('BACKGROUND_DENIED');
    await laporStatusTracking('BACKGROUND_DENIED');
    await laporStatusTracking('ACTIVE');

    expect((api.post as jest.Mock).mock.calls.map(([, body]) => body.status)).toEqual([
      'BACKGROUND_DENIED',
      'ACTIVE',
    ]);
    expect(api.post).toHaveBeenCalledWith('/api/mobile/attendance/tracking-status', {
      status: 'ACTIVE',
    });
  });

  it('check-in baru selalu dilaporkan walau statusnya sama', async () => {
    pasangStorage();

    await laporStatusTracking('ACTIVE');
    await laporStatusTracking('ACTIVE', { paksa: true });

    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('laporan yang gagal terkirim dicoba lagi berikutnya', async () => {
    pasangStorage();
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    await laporStatusTracking('GPS_OFF');
    await laporStatusTracking('GPS_OFF');

    expect(api.post).toHaveBeenCalledTimes(2);
  });
});
