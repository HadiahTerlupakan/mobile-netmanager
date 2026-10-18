import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

import {
  gerbangCheckIn,
  mulaiTrackingCheckIn,
  pulihkanTrackingSesi,
} from '../../src/services/penjagaTracking';
import {
  bisaDimintaLewatDialog,
  laporStatusTracking,
  mintaIzinTracking,
  periksaKesiapanTracking,
} from '../../src/services/kesiapanTracking';
import { LocationTrackingService } from '../../src/services/LocationTrackingService';
import {
  __resetPeringatanTrackingForTest,
  setPeringatanTrackingPresenter,
} from '../../src/utils/peringatanTracking';

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue(undefined),
  ActivityAction: { LOCATION_SOURCE_SETTINGS: 'android.settings.LOCATION_SOURCE_SETTINGS' },
}));
jest.mock('@/utils/logger');
jest.mock('../../src/services/kesiapanTracking', () => ({
  ...jest.requireActual('../../src/services/kesiapanTracking'),
  periksaKesiapanTracking: jest.fn(),
  mintaIzinTracking: jest.fn(),
  bisaDimintaLewatDialog: jest.fn().mockResolvedValue(false),
  laporStatusTracking: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/services/LocationTrackingService', () => ({
  LocationTrackingService: {
    isTrackingActive: jest.fn(),
    startTracking: jest.fn(),
  },
}));

const presenter = jest.fn();

describe('gerbangCheckIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetPeringatanTrackingForTest();
    setPeringatanTrackingPresenter(presenter);
    jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  });

  it('membolehkan check-in bila tracking siap', async () => {
    (mintaIzinTracking as jest.Mock).mockResolvedValue(null);

    expect(await gerbangCheckIn()).toBe(true);
    expect(presenter).not.toHaveBeenCalled();
  });

  it('menahan check-in dan menampilkan peringatan selama izin latar belum aktif', async () => {
    (mintaIzinTracking as jest.Mock).mockResolvedValue('izin-latar');
    presenter.mockResolvedValue('tutup');

    expect(await gerbangCheckIn()).toBe(false);
    expect(presenter).toHaveBeenCalledWith({ kendala: 'izin-latar', konteks: 'check-in' });
  });

  it('peringatan muncul lagi di setiap percobaan check-in berikutnya', async () => {
    (mintaIzinTracking as jest.Mock).mockResolvedValue('izin-latar');
    presenter.mockResolvedValue('tutup');

    await gerbangCheckIn();
    await gerbangCheckIn();

    expect(presenter).toHaveBeenCalledTimes(2);
  });

  it('Buka Pengaturan langsung membuka halaman izin lokasi selama Android masih mengizinkan', async () => {
    (mintaIzinTracking as jest.Mock).mockResolvedValue('izin-latar');
    (bisaDimintaLewatDialog as jest.Mock).mockResolvedValue(true);
    presenter.mockResolvedValue('pengaturan');

    expect(await gerbangCheckIn()).toBe(false);
    expect(bisaDimintaLewatDialog).toHaveBeenCalledWith('izin-latar');
    expect(mintaIzinTracking).toHaveBeenCalledTimes(2);
    expect(Linking.openSettings).not.toHaveBeenCalled();
  });

  it('jatuh ke pengaturan aplikasi bila dialog izin sudah diblokir Android', async () => {
    (mintaIzinTracking as jest.Mock).mockResolvedValue('izin-latar');
    (bisaDimintaLewatDialog as jest.Mock).mockResolvedValue(false);
    presenter.mockResolvedValue('pengaturan');

    expect(await gerbangCheckIn()).toBe(false);
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('membuka pengaturan lokasi Android bila GPS yang mati', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    (mintaIzinTracking as jest.Mock).mockResolvedValue('gps-mati');
    presenter.mockResolvedValue('pengaturan');

    await gerbangCheckIn();

    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS,
    );
  });
});

describe('pulihkanTrackingSesi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetPeringatanTrackingForTest();
    setPeringatanTrackingPresenter(presenter);
    presenter.mockResolvedValue('tutup');
    (bisaDimintaLewatDialog as jest.Mock).mockResolvedValue(false);
  });

  it('izin yang dicabut di tengah jam kerja dilaporkan dan diperingatkan', async () => {
    (periksaKesiapanTracking as jest.Mock).mockResolvedValue('izin-latar');

    await pulihkanTrackingSesi();

    expect(laporStatusTracking).toHaveBeenCalledWith('BACKGROUND_DENIED');
    expect(presenter).toHaveBeenCalledWith({ kendala: 'izin-latar', konteks: 'sesi' });
    expect(LocationTrackingService.startTracking).not.toHaveBeenCalled();
  });

  it('tracking langsung menyala sesudah izin diaktifkan dari peringatan', async () => {
    (periksaKesiapanTracking as jest.Mock)
      .mockResolvedValueOnce('izin-latar')
      .mockResolvedValueOnce(null);
    (bisaDimintaLewatDialog as jest.Mock).mockResolvedValue(true);
    (mintaIzinTracking as jest.Mock).mockResolvedValue(null);
    (LocationTrackingService.isTrackingActive as jest.Mock).mockResolvedValue(false);
    (LocationTrackingService.startTracking as jest.Mock).mockResolvedValue(true);
    presenter.mockResolvedValue('pengaturan');

    await pulihkanTrackingSesi();

    expect(LocationTrackingService.startTracking).toHaveBeenCalled();
    expect(laporStatusTracking).toHaveBeenLastCalledWith('ACTIVE');
  });

  it('menyalakan lagi tracking yang mati sesudah izinnya dipulihkan', async () => {
    (periksaKesiapanTracking as jest.Mock).mockResolvedValue(null);
    (LocationTrackingService.isTrackingActive as jest.Mock).mockResolvedValue(false);
    (LocationTrackingService.startTracking as jest.Mock).mockResolvedValue(true);

    await pulihkanTrackingSesi();

    expect(LocationTrackingService.startTracking).toHaveBeenCalled();
    expect(laporStatusTracking).toHaveBeenCalledWith('ACTIVE');
    expect(presenter).not.toHaveBeenCalled();
  });

  it('tracking yang sudah berjalan tidak didaftarkan ulang', async () => {
    (periksaKesiapanTracking as jest.Mock).mockResolvedValue(null);
    (LocationTrackingService.isTrackingActive as jest.Mock).mockResolvedValue(true);

    await pulihkanTrackingSesi();

    expect(LocationTrackingService.startTracking).not.toHaveBeenCalled();
    expect(laporStatusTracking).toHaveBeenCalledWith('ACTIVE');
  });

  it('dua pemanggil sekaligus hanya membuka pengaturan sekali', async () => {
    (periksaKesiapanTracking as jest.Mock).mockResolvedValue('izin-latar');
    presenter.mockResolvedValue('pengaturan');
    jest.spyOn(Linking, 'openSettings').mockResolvedValue();

    await Promise.all([pulihkanTrackingSesi(), pulihkanTrackingSesi()]);

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('dua pemanggil sekaligus hanya memunculkan satu peringatan', async () => {
    (periksaKesiapanTracking as jest.Mock).mockResolvedValue('gps-mati');
    let tutup: (hasil: string) => void = () => undefined;
    presenter.mockImplementation(() => new Promise((resolve) => (tutup = resolve)));

    const pertama = pulihkanTrackingSesi();
    const kedua = pulihkanTrackingSesi();
    await new Promise((resolve) => setImmediate(resolve));
    tutup('tutup');
    await Promise.all([pertama, kedua]);

    expect(presenter).toHaveBeenCalledTimes(1);
  });
});

describe('mulaiTrackingCheckIn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('melaporkan sesi baru sebagai aktif walau status terakhir yang terlapor sama', async () => {
    (LocationTrackingService.startTracking as jest.Mock).mockResolvedValue(true);

    expect(await mulaiTrackingCheckIn()).toBe(true);
    expect(laporStatusTracking).toHaveBeenCalledWith('ACTIVE', { paksa: true });
  });

  it('melaporkan tracking yang gagal dimulai', async () => {
    (LocationTrackingService.startTracking as jest.Mock).mockResolvedValue(false);

    expect(await mulaiTrackingCheckIn()).toBe(false);
    expect(laporStatusTracking).toHaveBeenCalledWith('START_FAILED', { paksa: true });
  });
});
