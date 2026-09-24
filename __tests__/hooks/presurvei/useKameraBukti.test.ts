import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

const mockRequestPermission = jest.fn<() => Promise<{ granted: boolean }>>();
const mockTakePicture = jest.fn<(opsi: { quality: number }) => Promise<{ uri: string } | undefined>>();
const mockPerkecilFoto = jest.fn<(uri: string) => Promise<string>>();
const mockPresentAppError = jest.fn();

let mockPermissionSekarang: { granted: boolean } | null = { granted: true };

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [mockPermissionSekarang, mockRequestPermission],
}));

jest.mock('@/utils/errorPresenter', () => ({
  presentAppError: (...args: unknown[]) => mockPresentAppError(...args),
}));

jest.mock('@/utils/presurvei/fotoBukti', () => ({
  KUALITAS_FOTO_BUKTI: 0.7,
  perkecilFoto: (uri: string) => mockPerkecilFoto(uri),
}));

import { useKameraBukti } from '@/hooks/presurvei/useKameraBukti';

describe('useKameraBukti', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionSekarang = { granted: true };
  });

  it('isIzinDiberikan mengikuti status permission, dan mintaIzin memicu permintaan', () => {
    mockPermissionSekarang = { granted: false };
    const { result } = renderHook(() => useKameraBukti(jest.fn()));

    expect(result.current.isIzinDiberikan).toBe(false);

    act(() => result.current.mintaIzin());

    expect(mockRequestPermission).toHaveBeenCalledWith();
  });

  it('memotret, memperkecil foto, lalu menyerahkan URI ke pemanggil', async () => {
    mockTakePicture.mockResolvedValue({ uri: 'file:///cache/asli.jpg' });
    mockPerkecilFoto.mockResolvedValue('file:///cache/kecil.jpg');
    const onAmbil = jest.fn();
    const { result } = renderHook(() => useKameraBukti(onAmbil));
    // @ts-expect-error - ref hanya butuh takePictureAsync untuk test ini.
    result.current.kamera.current = { takePictureAsync: mockTakePicture };

    await act(async () => {
      await result.current.potret();
    });

    expect(mockTakePicture).toHaveBeenCalledWith({ quality: 0.7 });
    expect(mockPerkecilFoto).toHaveBeenCalledWith('file:///cache/asli.jpg');
    expect(onAmbil).toHaveBeenCalledWith('file:///cache/kecil.jpg');
    expect(result.current.isMemotret).toBe(false);
  });

  it('tidak memotret bila referensi kamera belum siap', async () => {
    const onAmbil = jest.fn();
    const { result } = renderHook(() => useKameraBukti(onAmbil));

    await act(async () => {
      await result.current.potret();
    });

    expect(mockTakePicture).not.toHaveBeenCalled();
    expect(onAmbil).not.toHaveBeenCalled();
  });

  it('mengabaikan potret kedua selagi yang pertama masih berjalan', async () => {
    let selesaikanPotretPertama: ((hasil: { uri: string }) => void) | undefined;
    mockTakePicture.mockImplementation(
      () => new Promise((resolve) => { selesaikanPotretPertama = resolve; }),
    );
    mockPerkecilFoto.mockResolvedValue('file:///cache/kecil.jpg');
    const onAmbil = jest.fn();
    const { result } = renderHook(() => useKameraBukti(onAmbil));
    // @ts-expect-error - ref hanya butuh takePictureAsync untuk test ini.
    result.current.kamera.current = { takePictureAsync: mockTakePicture };

    let janjiPertama!: Promise<void>;
    act(() => {
      janjiPertama = result.current.potret();
    });
    expect(result.current.isMemotret).toBe(true);

    await act(async () => {
      await result.current.potret();
    });
    expect(mockTakePicture).toHaveBeenCalledTimes(1);

    await act(async () => {
      selesaikanPotretPertama?.({ uri: 'file:///cache/asli.jpg' });
      await janjiPertama;
    });
    expect(onAmbil).toHaveBeenCalledWith('file:///cache/kecil.jpg');
  });

  it('melaporkan galat lewat presentAppError bila potret gagal', async () => {
    const error = new Error('kamera error');
    mockTakePicture.mockRejectedValue(error);
    const onAmbil = jest.fn();
    const { result } = renderHook(() => useKameraBukti(onAmbil));
    // @ts-expect-error - ref hanya butuh takePictureAsync untuk test ini.
    result.current.kamera.current = { takePictureAsync: mockTakePicture };

    await act(async () => {
      await result.current.potret();
    });

    expect(mockPresentAppError).toHaveBeenCalledWith(error, { screen: 'KameraBukti' });
    expect(onAmbil).not.toHaveBeenCalled();
    expect(result.current.isMemotret).toBe(false);
  });
});
