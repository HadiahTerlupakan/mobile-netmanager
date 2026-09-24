import { describe, expect, it, jest } from '@jest/globals';

const mockManipulate = jest.fn<(uri: string, aksi: unknown, opsi: unknown) => Promise<{ uri: string }>>();
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (uri: string, aksi: unknown, opsi: unknown) => mockManipulate(uri, aksi, opsi),
  SaveFormat: { JPEG: 'jpeg' },
}));

import { perkecilFoto } from '@/utils/presurvei/fotoBukti';

describe('perkecilFoto', () => {
  it('mengubah ukuran ke lebar 1024 dan JPEG kualitas 0.7', async () => {
    mockManipulate.mockResolvedValue({ uri: 'file:///cache/kecil.jpg' });

    const hasil = await perkecilFoto('file:///cache/asli.jpg');

    expect(mockManipulate).toHaveBeenCalledWith(
      'file:///cache/asli.jpg',
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: 'jpeg' },
    );
    expect(hasil).toBe('file:///cache/kecil.jpg');
  });
});
