import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Bukti transfer dulu dikirim dengan MIME tebakan dari ekstensi
 * (`image/jpg`, atau `image` saja bila nama berkas tanpa ekstensi), hanya dari
 * galeri, dan dengan pemotongan paksa (`allowsEditing`). Server memeriksa
 * isi berkas yang sebenarnya (JPEG/PNG/WebP, maks 5 MB).
 */

const mockIzinKamera = jest.fn<() => Promise<{ granted: boolean }>>();
const mockKamera = jest.fn<(opsi: unknown) => Promise<unknown>>();
const mockGaleri = jest.fn<(opsi: unknown) => Promise<unknown>>();
const mockPerkecil = jest.fn<(uri: string, opsi: { lebar: number; kualitas: number }) => Promise<string>>(async () => 'file:///cache/kecil.jpg');

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: () => mockIzinKamera(),
  launchCameraAsync: (opsi: unknown) => mockKamera(opsi),
  launchImageLibraryAsync: (opsi: unknown) => mockGaleri(opsi),
}));
jest.mock('@/utils/perkecilFoto', () => ({
  perkecilFoto: (uri: string, opsi: { lebar: number; kualitas: number }) => mockPerkecil(uri, opsi),
}));

import { ambilFotoBukti } from '@/utils/tagihan/fotoBuktiTransfer';

const aset = (ubah: Record<string, unknown> = {}) => ({
  canceled: false,
  assets: [{ uri: 'file:///dcim/IMG_1.jpg', fileName: 'IMG_1.jpg', mimeType: 'image/jpeg', width: 1080, height: 2400, fileSize: 400_000, ...ubah }],
});

beforeEach(() => {
  mockPerkecil.mockClear();
  mockIzinKamera.mockResolvedValue({ granted: true });
});

describe('ambilFotoBukti', () => {
  it('memotret tanpa pemotongan paksa dan mengirim MIME aslinya', async () => {
    mockKamera.mockResolvedValue(aset());

    const hasil = await ambilFotoBukti('kamera');

    expect(mockKamera).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: false }));
    expect(hasil).toEqual({ status: 'ok', foto: { uri: 'file:///dcim/IMG_1.jpg', nama: 'IMG_1.jpg', mimeType: 'image/jpeg' } });
  });

  it('memilih dari galeri tanpa pemotongan paksa', async () => {
    mockGaleri.mockResolvedValue(aset({ uri: 'file:///pick/shot', fileName: null, mimeType: 'image/png' }));

    const hasil = await ambilFotoBukti('galeri');

    expect(mockGaleri).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: false }));
    expect(hasil).toEqual({ status: 'ok', foto: { uri: 'file:///pick/shot', nama: 'shot', mimeType: 'image/png' } });
  });

  it.each([
    ['format yang ditolak server (HEIC)', { mimeType: 'image/heic' }],
    ['MIME tidak diketahui', { mimeType: undefined }],
    ['foto kamera beresolusi besar', { width: 4000 }],
    ['berkas di atas 5 MB', { fileSize: 6_000_000 }],
  ])('%s dikompres ulang menjadi JPEG', async (_kasus, ubah) => {
    mockKamera.mockResolvedValue(aset(ubah));

    const hasil = await ambilFotoBukti('kamera');

    expect(hasil).toEqual({ status: 'ok', foto: { uri: 'file:///cache/kecil.jpg', nama: 'bukti-transfer.jpg', mimeType: 'image/jpeg' } });
  });

  it('foto besar diperkecil ke lebar maksimal, foto kecil tidak diperbesar', async () => {
    mockKamera.mockResolvedValueOnce(aset({ width: 4000 })).mockResolvedValueOnce(aset({ width: 900, mimeType: 'image/heic' }));

    await ambilFotoBukti('kamera');
    await ambilFotoBukti('kamera');

    expect(mockPerkecil.mock.calls.map(([, opsi]) => opsi.lebar)).toEqual([2000, 900]);
  });

  it('izin kamera ditolak', async () => {
    mockIzinKamera.mockResolvedValue({ granted: false });

    await expect(ambilFotoBukti('kamera')).resolves.toEqual({ status: 'izin-ditolak' });
    expect(mockKamera).not.toHaveBeenCalled();
  });

  it('batal memilih', async () => {
    mockGaleri.mockResolvedValue({ canceled: true, assets: null });

    await expect(ambilFotoBukti('galeri')).resolves.toEqual({ status: 'batal' });
  });
});
