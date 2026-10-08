import { sumberGambarUpload } from '@/utils/sumberGambarUpload';
import { TenantService } from '@/services/TenantService';
import { TokenService } from '@/services/TokenService';

/**
 * Server menolak `/uploads/` tanpa sesi, dan aplikasi tidak pernah memegang
 * cookie. Tanpa header ini foto yang diunggah dari aplikasi balas 401 saat
 * hendak ditampilkan kembali — dan sebaliknya, token tidak boleh ikut terkirim
 * ke host mana pun selain server tenant.
 */

jest.mock('@/services/TenantService', () => ({
  TenantService: { getTenantUrl: jest.fn() },
}));

const getTenantUrl = TenantService.getTenantUrl as jest.Mock;

beforeEach(() => {
  getTenantUrl.mockReturnValue('https://tenant.example.com');
  TokenService.setToken('token-abc');
});

afterEach(() => {
  TokenService.setToken(null);
});

describe('sumberGambarUpload', () => {
  it('menempelkan token untuk upload di server tenant', () => {
    expect(sumberGambarUpload('https://tenant.example.com/uploads/a.webp')).toEqual({
      uri: 'https://tenant.example.com/uploads/a.webp',
      headers: { Authorization: 'Bearer token-abc' },
    });
  });

  // Bucket publik dan avatar pihak ketiga tidak butuh sesi; mengirim token ke
  // sana berarti membocorkannya ke pihak yang tidak berhak.
  it('tidak mengirim token ke host lain', () => {
    expect(sumberGambarUpload('https://cdn.pihak-lain.com/uploads/a.webp')).toEqual({
      uri: 'https://cdn.pihak-lain.com/uploads/a.webp',
    });
  });

  // Host tenant juga menyajikan aset yang bukan upload privat.
  it('tidak mengirim token untuk jalur selain uploads', () => {
    expect(sumberGambarUpload('https://tenant.example.com/logo.png')).toEqual({
      uri: 'https://tenant.example.com/logo.png',
    });
  });

  it('foto lokal dari kamera atau galeri dibiarkan apa adanya', () => {
    expect(sumberGambarUpload('file:///data/foto.jpg')).toEqual({
      uri: 'file:///data/foto.jpg',
    });
  });

  it('tanpa token, URI tetap dipakai apa adanya', () => {
    TokenService.setToken(null);

    expect(sumberGambarUpload('https://tenant.example.com/uploads/a.webp')).toEqual({
      uri: 'https://tenant.example.com/uploads/a.webp',
    });
  });

  // Host tenant kadang tersimpan dengan garis miring di ujung; tanpa normalisasi
  // perbandingannya meleset dan token tidak pernah terpasang.
  it('tahan terhadap garis miring di ujung URL tenant', () => {
    getTenantUrl.mockReturnValue('https://tenant.example.com/');

    expect(
      sumberGambarUpload('https://tenant.example.com/uploads/a.webp').headers,
    ).toEqual({ Authorization: 'Bearer token-abc' });
  });

  // Host yang kebetulan berawalan sama ("tenant.example.com.jahat.id") bukan
  // server tenant.
  it('tidak tertipu host yang berawalan sama', () => {
    expect(
      sumberGambarUpload('https://tenant.example.com.jahat.id/uploads/a.webp'),
    ).toEqual({ uri: 'https://tenant.example.com.jahat.id/uploads/a.webp' });
  });
});
