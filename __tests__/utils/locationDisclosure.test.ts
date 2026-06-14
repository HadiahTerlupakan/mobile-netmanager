import * as Location from 'expo-location';
import {
  setDisclosurePresenter,
  requestForegroundLocationWithDisclosure,
  ensureDisclosureBeforeBackground,
  __resetDisclosureStateForTest,
} from '../../src/utils/locationDisclosure';

jest.mock('expo-location');
jest.mock('@/utils/logger');

const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
} as const;

// Selaraskan enum dengan mock
(Location as any).PermissionStatus = PermissionStatus;

// Pastikan fungsi mock ada (automock kadang melewatkannya)
(Location as any).getForegroundPermissionsAsync =
  (Location as any).getForegroundPermissionsAsync ?? jest.fn();
(Location as any).requestForegroundPermissionsAsync =
  (Location as any).requestForegroundPermissionsAsync ?? jest.fn();

const mockGetForeground = Location.getForegroundPermissionsAsync as jest.Mock;
const mockRequestForeground = Location.requestForegroundPermissionsAsync as jest.Mock;

describe('locationDisclosure gateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetDisclosureStateForTest();
    // default aman agar tiap test eksplisit set sendiri
    mockGetForeground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    mockRequestForeground.mockResolvedValue({ status: 'granted' });
    setDisclosurePresenter(null);
  });

  describe('requestForegroundLocationWithDisclosure', () => {
    it('skip modal & langsung lanjut jika izin OS sudah granted (tidak ada dialog OS)', async () => {
      mockGetForeground.mockResolvedValue({ status: 'granted', canAskAgain: true });
      const presenter = jest.fn().mockResolvedValue(true);
      setDisclosurePresenter(presenter);

      const result = await requestForegroundLocationWithDisclosure();

      expect(result.status).toBe('granted');
      expect(presenter).not.toHaveBeenCalled(); // tidak perlu modal
      expect(mockRequestForeground).not.toHaveBeenCalled(); // tidak ada request OS
    });

    it('TAMPILKAN disclosure SEBELUM request OS saat izin belum granted (kasus inti Google)', async () => {
      mockGetForeground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      const callOrder: string[] = [];
      const presenter = jest.fn(async () => {
        callOrder.push('disclosure');
        return true;
      });
      mockRequestForeground.mockImplementation(async () => {
        callOrder.push('os-request');
        return { status: 'granted' };
      });
      setDisclosurePresenter(presenter);

      const result = await requestForegroundLocationWithDisclosure();

      expect(presenter).toHaveBeenCalled();
      expect(mockRequestForeground).toHaveBeenCalled();
      // URUTAN WAJIB: disclosure dulu, baru dialog OS
      expect(callOrder).toEqual(['disclosure', 'os-request']);
      expect(result.status).toBe('granted');
    });

    it('TIDAK request OS jika user menolak disclosure (tidak ada dialog OS tanpa consent)', async () => {
      mockGetForeground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
      const presenter = jest.fn().mockResolvedValue(false); // user tolak
      setDisclosurePresenter(presenter);

      const result = await requestForegroundLocationWithDisclosure();

      expect(presenter).toHaveBeenCalled();
      expect(mockRequestForeground).not.toHaveBeenCalled(); // KRUSIAL: tidak ada dialog OS
      expect(result.status).toBe('denied');
    });

    it('REGRESI: percobaan kedua tetap tampilkan disclosure (bug storage flag lama)', async () => {
      // Simulasi: user sebelumnya sudah lihat modal & accept, tapi tolak izin OS.
      // Izin OS masih 'undetermined'/'denied' tapi canAskAgain. Disclosure HARUS tampil lagi.
      mockGetForeground.mockResolvedValue({ status: 'denied', canAskAgain: true });
      const presenter = jest.fn().mockResolvedValue(true);
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      setDisclosurePresenter(presenter);

      await requestForegroundLocationWithDisclosure();

      // Inilah perbaikan inti: modal TIDAK di-skip walau "pernah accept" sebelumnya
      expect(presenter).toHaveBeenCalled();
    });

    it('tidak request OS & tidak tampilkan modal jika canAskAgain=false (OS tak akan munculkan dialog)', async () => {
      mockGetForeground.mockResolvedValue({ status: 'denied', canAskAgain: false });
      const presenter = jest.fn().mockResolvedValue(true);
      setDisclosurePresenter(presenter);

      const result = await requestForegroundLocationWithDisclosure();

      expect(presenter).not.toHaveBeenCalled();
      expect(mockRequestForeground).not.toHaveBeenCalled();
      expect(result.status).toBe('denied');
    });

    it('return denied jika presenter belum terdaftar (tidak ada dialog OS tanpa disclosure)', async () => {
      mockGetForeground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
      setDisclosurePresenter(null); // provider belum mount

      const result = await requestForegroundLocationWithDisclosure();

      expect(mockRequestForeground).not.toHaveBeenCalled(); // KRUSIAL: tetap tak ada dialog OS
      expect(result.status).toBe('denied');
    });

    it('gabungkan request paralel jadi satu modal (tidak dobel)', async () => {
      mockGetForeground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
      mockRequestForeground.mockResolvedValue({ status: 'granted' });
      let resolvePresenter: (v: boolean) => void = () => {};
      const presenter = jest.fn(
        () => new Promise<boolean>((r) => { resolvePresenter = r; }),
      );
      setDisclosurePresenter(presenter);

      const p1 = requestForegroundLocationWithDisclosure();
      const p2 = requestForegroundLocationWithDisclosure();
      // Tunggu beberapa microtask agar kedua pemanggil melewati
      // getForegroundPermissionsAsync dan sampai ke presentDisclosure.
      await new Promise((r) => setImmediate(r));
      resolvePresenter(true);
      await Promise.all([p1, p2]);

      expect(presenter).toHaveBeenCalledTimes(1); // satu modal untuk dua pemanggil
    });
  });

  describe('ensureDisclosureBeforeBackground', () => {
    it('tampilkan disclosure & return true saat user setuju', async () => {
      const presenter = jest.fn().mockResolvedValue(true);
      setDisclosurePresenter(presenter);

      const result = await ensureDisclosureBeforeBackground();

      expect(presenter).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('return false saat user menolak (background tidak diminta)', async () => {
      const presenter = jest.fn().mockResolvedValue(false);
      setDisclosurePresenter(presenter);

      const result = await ensureDisclosureBeforeBackground();

      expect(result).toBe(false);
    });

    it('return false jika presenter belum terdaftar', async () => {
      setDisclosurePresenter(null);

      const result = await ensureDisclosureBeforeBackground();

      expect(result).toBe(false);
    });
  });
});
