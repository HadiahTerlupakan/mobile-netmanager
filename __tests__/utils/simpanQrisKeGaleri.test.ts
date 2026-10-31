import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

const mockTulis = jest.fn(async () => undefined);
const mockIzin = jest.fn<() => Promise<{ status: string }>>();
const mockSimpan = jest.fn<(uri: string) => Promise<void>>(async () => undefined);
const mockBisaBerbagi = jest.fn<() => Promise<boolean>>(async () => true);
const mockBagikan = jest.fn<(uri: string, opsi?: unknown) => Promise<void>>(async () => undefined);

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: (...args: unknown[]) => mockTulis(...(args as [])),
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: (...args: unknown[]) => mockIzin(...(args as [])),
  saveToLibraryAsync: (uri: string) => mockSimpan(uri),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockBisaBerbagi(),
  shareAsync: (uri: string, opsi?: unknown) => mockBagikan(uri, opsi),
}));

import { simpanQrisKeGaleri } from '@/utils/simpanQrisKeGaleri';

const URI_QRIS = 'file:///cache/qris-pembayaran.png';
const OS_ASLI = Platform.OS;

function jadikanAndroid(apiLevel: number) {
  Platform.OS = 'android';
  Object.defineProperty(Platform, 'Version', { get: () => apiLevel, configurable: true });
}

beforeEach(() => {
  mockTulis.mockClear();
  mockSimpan.mockClear();
  mockIzin.mockReset();
  mockBagikan.mockClear();
  mockBisaBerbagi.mockResolvedValue(true);
  mockIzin.mockResolvedValue({ status: 'granted' });
});

afterEach(() => {
  Platform.OS = OS_ASLI;
});

describe('simpanQrisKeGaleri', () => {
  it('menyimpan PNG QRIS ke galeri', async () => {
    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('tersimpan');

    expect(mockTulis).toHaveBeenCalledWith(URI_QRIS, 'UE5H', { encoding: 'base64' });
    expect(mockSimpan).toHaveBeenCalledWith(URI_QRIS);
  });

  it('Android 13 ke atas menyimpan langsung ke galeri', async () => {
    jadikanAndroid(33);

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('tersimpan');
  });

  // Di bawah API 33 expo-media-library butuh WRITE_EXTERNAL_STORAGE, yang
  // diblokir app.json; tanpa build native baru, gambarnya dibagikan.
  it('Android 8–12 membagikan gambar QRIS tanpa meminta izin galeri', async () => {
    jadikanAndroid(30);

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('dibagikan');

    expect(mockIzin).not.toHaveBeenCalled();
    expect(mockSimpan).not.toHaveBeenCalled();
    expect(mockBagikan).toHaveBeenCalledWith(URI_QRIS, expect.objectContaining({ mimeType: 'image/png' }));
  });

  it('izin galeri ditolak: gambar dibagikan', async () => {
    mockIzin.mockResolvedValue({ status: 'denied' });

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('dibagikan');

    expect(mockSimpan).not.toHaveBeenCalled();
  });

  it('galeri menolak penyimpanan: gambar dibagikan', async () => {
    mockSimpan.mockRejectedValue(new Error('Missing MEDIA_LIBRARY write permission'));

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('dibagikan');
  });

  it('tanpa izin dan tanpa menu berbagi: ditolak', async () => {
    mockIzin.mockResolvedValue({ status: 'denied' });
    mockBisaBerbagi.mockResolvedValue(false);

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('ditolak');

    expect(mockBagikan).not.toHaveBeenCalled();
  });
});
