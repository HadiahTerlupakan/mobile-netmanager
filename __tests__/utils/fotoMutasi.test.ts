import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPersist = jest.fn<(uri: string) => Promise<string>>();
const mockIsBerkasAda = jest.fn<(uri: string) => Promise<boolean>>();
jest.mock('@/utils/persistPhoto', () => ({
  persistPhotoForOffline: (uri: string) => mockPersist(uri),
  isBerkasLokalAda: (uri: string) => mockIsBerkasAda(uri),
}));

import { NAMA_GALAT_UNGGAH_HABIS_WAKTU } from '@/services/UploadService';
import {
  adaFotoLokalHilang,
  isGalatResponsServer,
  isUnggahHabisWaktu,
  salinFotoMetaUntukAntrean,
  unggahFotoMeta,
  unggahPetaFoto,
} from '@/utils/fotoMutasi';

const unggah = jest.fn(async (uri: string, _tipe: string) => `https://cdn.test/${uri.split('/').pop()}`);

beforeEach(() => {
  unggah.mockClear();
  mockIsBerkasAda.mockReset();
  mockIsBerkasAda.mockResolvedValue(true);
  mockPersist.mockImplementation(async (uri) =>
    uri.replace('file:///cache/', 'file:///dokumen/offline-photos/'),
  );
});

describe('unggahFotoMeta', () => {
  it('daftar foto kosong tidak menimpa targetField', async () => {
    // Pola `work-order-detail/[id].tsx:299-300`: `photos: []` + `targetField`
    // dengan nilai yang sudah ada di payload. Menimpanya jadi [] menghapusnya.
    const payload: Record<string, unknown> = { photoUrl: 'https://cdn.test/lama.jpg' };

    await unggahFotoMeta({ photos: [], targetField: 'photoUrl' }, payload, unggah);

    expect(payload).toEqual({ photoUrl: 'https://cdn.test/lama.jpg' });
    expect(unggah).not.toHaveBeenCalled();
  });

  it('tanpa targetField tidak mengunggah apa pun', async () => {
    const payload: Record<string, unknown> = {};

    await unggahFotoMeta({ photos: ['file:///cache/a.jpg'] }, payload, unggah);

    expect(payload).toEqual({});
    expect(unggah).not.toHaveBeenCalled();
  });

  it('memakai tipe general bila photoType tidak diisi', async () => {
    const payload: Record<string, unknown> = {};

    await unggahFotoMeta({ photos: ['file:///cache/a.jpg'], targetField: 'foto' }, payload, unggah);

    expect(unggah).toHaveBeenCalledWith('file:///cache/a.jpg', 'general');
    expect(payload).toEqual({ foto: ['https://cdn.test/a.jpg'] });
  });

  it('mengembalikan URL hasil unggah, atau null bila tidak ada yang diunggah', async () => {
    const urls = await unggahFotoMeta(
      { photos: ['https://cdn.test/lama.jpg', 'file:///cache/b.jpg'], targetField: 'fotoUrls', singleFile: true },
      {},
      unggah,
    );
    const kosong = await unggahFotoMeta({ photos: [], targetField: 'fotoUrls' }, {}, unggah);

    expect(urls).toEqual(['https://cdn.test/lama.jpg', 'https://cdn.test/b.jpg']);
    expect(kosong).toBeNull();
  });

  it('payload tidak disentuh bila salah satu unggahan gagal', async () => {
    const payload: Record<string, unknown> = { jenis: 'KUNJUNGAN' };
    const gagalKedua = jest.fn(async (uri: string) => {
      if (uri.endsWith('b.jpg')) throw new Error('Network request failed');
      return `https://cdn.test/${uri.split('/').pop()}`;
    });

    await expect(
      unggahFotoMeta(
        { photos: ['file:///cache/a.jpg', 'file:///cache/b.jpg'], targetField: 'fotoUrls' },
        payload,
        gagalKedua,
      ),
    ).rejects.toThrow('Network request failed');
    expect(payload).toEqual({ jenis: 'KUNJUNGAN' });
  });
});

describe('unggahPetaFoto', () => {
  it('mengunggah entri lokal ke medannya dan melewati yang kosong atau sudah URL', async () => {
    const payload: Record<string, unknown> = { foto: 'nilai-pemanggil' };

    await unggahPetaFoto(
      {
        photoMap: { fotoKtp: 'file:///cache/ktp.jpg', foto: 'https://cdn.test/lama.jpg', kosong: '' },
        photoType: 'marketing',
      },
      payload,
      unggah,
    );

    expect(unggah.mock.calls).toEqual([['file:///cache/ktp.jpg', 'marketing']]);
    expect(payload).toEqual({ foto: 'nilai-pemanggil', fotoKtp: 'https://cdn.test/ktp.jpg' });
  });
});

describe('salinFotoMetaUntukAntrean', () => {
  it('menyalin photos dan photoMap ke penyimpanan tetap tanpa mengubah meta asal', async () => {
    const metaAsal = Object.freeze({
      photos: Object.freeze(['file:///cache/a.jpg', 'https://cdn.test/lama.jpg']),
      photoMap: Object.freeze({ fotoKtp: 'file:///cache/ktp.jpg', kosong: '' }),
      targetField: 'fotoUrls',
    });

    const hasil = await salinFotoMetaUntukAntrean(metaAsal as unknown as Record<string, unknown>);

    expect(hasil).toEqual({
      photos: ['file:///dokumen/offline-photos/a.jpg', 'https://cdn.test/lama.jpg'],
      photoMap: { fotoKtp: 'file:///dokumen/offline-photos/ktp.jpg' },
      targetField: 'fotoUrls',
    });
    expect(metaAsal.photos).toEqual(['file:///cache/a.jpg', 'https://cdn.test/lama.jpg']);
  });

  it('memakai URL hasil unggah sebagai photos bila sudah terunggah, tanpa menyalin', async () => {
    const urlTerunggah = Object.freeze(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);

    const hasil = await salinFotoMetaUntukAntrean(
      { photos: ['file:///cache/a.jpg', 'file:///cache/b.jpg'], targetField: 'fotoUrls' },
      urlTerunggah,
    );

    expect(hasil).toEqual({
      photos: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
      targetField: 'fotoUrls',
    });
    expect(hasil.photos).not.toBe(urlTerunggah);
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('meta tanpa foto dikembalikan apa adanya', async () => {
    const hasil = await salinFotoMetaUntukAntrean({ requestId: 'r-1' });

    expect(hasil).toEqual({ requestId: 'r-1' });
    expect(mockPersist).not.toHaveBeenCalled();
  });
});

describe('isGalatResponsServer', () => {
  it('mengenali galat yang lahir dari respons server UploadService', () => {
    expect(isGalatResponsServer(new Error('Upload failed with status 413: terlalu besar'))).toBe(true);
    expect(isGalatResponsServer(new Error('Invalid response from upload server'))).toBe(true);
    expect(isGalatResponsServer(new SyntaxError('Unexpected token < in JSON'))).toBe(true);
  });

  it('galat transport, habis waktu, dan nilai non-Error bukan respons server', () => {
    const habisWaktu = new Error('Upload melebihi batas waktu');
    habisWaktu.name = 'UploadTimeoutError';

    expect(isGalatResponsServer(new Error('Network request failed'))).toBe(false);
    expect(isGalatResponsServer(new Error('Unable to resolve host "api.test"'))).toBe(false);
    expect(isGalatResponsServer(habisWaktu)).toBe(false);
    expect(isGalatResponsServer('Upload failed with status 413')).toBe(false);
  });
});

describe('adaFotoLokalHilang', () => {
  it('true bila salah satu foto lokal tidak ada; URL tidak diperiksa', async () => {
    mockIsBerkasAda.mockImplementation(async (uri) => !uri.endsWith('b.jpg'));

    const hasil = await adaFotoLokalHilang({
      photos: ['https://cdn.test/lama.jpg', 'file:///cache/a.jpg', 'file:///cache/b.jpg'],
    });

    expect(hasil).toBe(true);
    expect(mockIsBerkasAda.mock.calls).toEqual([['file:///cache/a.jpg'], ['file:///cache/b.jpg']]);
  });

  it('false bila semua foto ada atau tidak ada foto', async () => {
    expect(await adaFotoLokalHilang({ photos: ['file:///cache/a.jpg'] })).toBe(false);
    expect(await adaFotoLokalHilang(undefined)).toBe(false);
  });
});

describe('isUnggahHabisWaktu', () => {
  it('mengenali galat habis waktu UploadService dari namanya', () => {
    const galat = new Error('Upload melebihi batas waktu');
    galat.name = 'UploadTimeoutError';

    expect(NAMA_GALAT_UNGGAH_HABIS_WAKTU).toBe('UploadTimeoutError');
    expect(isUnggahHabisWaktu(galat)).toBe(true);
    expect(isUnggahHabisWaktu(new Error('Upload failed with status 413'))).toBe(false);
    expect(isUnggahHabisWaktu('UploadTimeoutError')).toBe(false);
  });
});
