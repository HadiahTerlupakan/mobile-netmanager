import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSimpanQris = jest.fn<(base64: string) => Promise<string>>();

jest.mock('@/utils/simpanQrisKeGaleri', () => ({ simpanQrisKeGaleri: (base64: string) => mockSimpanQris(base64) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

import { simpanQris } from '@/utils/tagihan/aksiInstruksiBayar';
import { toastTerakhir } from '../fixtures/portalPelanggan';

const Toast = jest.requireMock('react-native-toast-message') as { show: jest.Mock };

beforeEach(() => {
  Toast.show.mockClear();
});

describe('simpanQris', () => {
  it('tersimpan: pelanggan diberi tahu cara memakainya di e-wallet', async () => {
    mockSimpanQris.mockResolvedValue('tersimpan');

    await simpanQris('UE5H');

    expect(toastTerakhir()?.text2).toMatch(/QRIS tersimpan di Galeri/);
  });

  // Menu berbagi sudah menjadi umpan baliknya; "tersimpan di Galeri" keliru.
  it('dibagikan: tidak ada toast tersimpan', async () => {
    mockSimpanQris.mockResolvedValue('dibagikan');

    await simpanQris('UE5H');

    expect(Toast.show).not.toHaveBeenCalled();
  });

  it('ditolak: pelanggan diminta mengizinkan galeri', async () => {
    mockSimpanQris.mockResolvedValue('ditolak');

    await simpanQris('UE5H');

    expect(toastTerakhir()?.text2).toMatch(/Izinkan akses Galeri/);
  });
});
