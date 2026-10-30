import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockTulis = jest.fn(async () => undefined);
const mockIzin = jest.fn<() => Promise<{ status: string }>>();
const mockSimpan = jest.fn(async () => undefined);

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: (...args: unknown[]) => mockTulis(...(args as [])),
}));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: (...args: unknown[]) => mockIzin(...(args as [])),
  saveToLibraryAsync: (...args: unknown[]) => mockSimpan(...(args as [])),
}));

import { simpanQrisKeGaleri } from '@/utils/simpanQrisKeGaleri';

beforeEach(() => {
  mockTulis.mockClear();
  mockSimpan.mockClear();
});

describe('simpanQrisKeGaleri', () => {
  it('menyimpan PNG QRIS ke galeri', async () => {
    mockIzin.mockResolvedValue({ status: 'granted' });

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('tersimpan');

    expect(mockTulis).toHaveBeenCalledWith('file:///cache/qris-pembayaran.png', 'UE5H', { encoding: 'base64' });
    expect(mockSimpan).toHaveBeenCalledWith('file:///cache/qris-pembayaran.png');
  });

  it('tanpa izin galeri tidak menyimpan apa pun', async () => {
    mockIzin.mockResolvedValue({ status: 'denied' });

    await expect(simpanQrisKeGaleri('UE5H')).resolves.toBe('ditolak');

    expect(mockSimpan).not.toHaveBeenCalled();
  });
});
