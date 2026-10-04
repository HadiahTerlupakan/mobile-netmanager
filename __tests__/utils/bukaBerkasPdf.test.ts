import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockContentUri = jest.fn<(uri: string) => Promise<string>>(async () => 'content://pengesahan.pdf');
jest.mock('expo-file-system/legacy', () => ({ getContentUriAsync: (uri: string) => mockContentUri(uri) }));
const mockStartActivity = jest.fn<(aksi: string, params: unknown) => Promise<unknown>>();
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: (aksi: string, params: unknown) => mockStartActivity(aksi, params) }));
const mockShare = jest.fn<(uri: string, opsi: unknown) => Promise<void>>(async () => undefined);
jest.mock('expo-sharing', () => ({ shareAsync: (uri: string, opsi: unknown) => mockShare(uri, opsi) }));

const URI_LOKAL = 'file:///cache/pengesahan-d-1.pdf';

/** Muat modul dengan `Platform.OS` tertentu. */
function muatDenganPlatform(os: 'android' | 'ios'): typeof import('@/utils/bukaBerkasPdf') {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  return require('@/utils/bukaBerkasPdf');
}

describe('bukaBerkasPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Android: buka lewat intent VIEW dengan content URI dan izin baca', async () => {
    mockStartActivity.mockResolvedValueOnce({ resultCode: 0 });
    await muatDenganPlatform('android').bukaBerkasPdf(URI_LOKAL);

    expect(mockContentUri).toHaveBeenCalledWith(URI_LOKAL);
    expect(mockStartActivity).toHaveBeenCalledWith('android.intent.action.VIEW', {
      data: 'content://pengesahan.pdf',
      type: 'application/pdf',
      flags: 1,
    });
    expect(mockShare).not.toHaveBeenCalled();
  });

  it('Android tanpa aplikasi pembaca PDF: jatuh ke lembar bagikan', async () => {
    mockStartActivity.mockRejectedValueOnce(new Error('No Activity found'));
    await muatDenganPlatform('android').bukaBerkasPdf(URI_LOKAL);

    expect(mockShare).toHaveBeenCalledWith(URI_LOKAL, expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('iOS: pratinjau lewat lembar bagikan', async () => {
    await muatDenganPlatform('ios').bukaBerkasPdf(URI_LOKAL);

    expect(mockStartActivity).not.toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalledWith(URI_LOKAL, expect.objectContaining({ UTI: 'com.adobe.pdf' }));
  });
});
