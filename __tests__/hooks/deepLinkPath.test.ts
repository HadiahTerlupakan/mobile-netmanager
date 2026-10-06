// `useDeepLink` menarik expo-router hanya untuk hook navigasinya; yang diuji
// di sini fungsi murni, jadi router cukup di-stub.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
}));

import { isAppDeepLink } from '@/hooks/useDeepLink';

// Catatan: `parseDeepLinkPath` sengaja tidak diuji di sini. Ia bersandar pada
// `Linking.parse`, yang di luar perangkat mengembalikan URL apa adanya tanpa
// memecah scheme/hostname — assertion apa pun terhadapnya akan lolos karena
// alasan yang salah. `isAppDeepLink` justru dibuat tidak bergantung runtime
// supaya perilakunya bisa dikunci di sini.
describe('isAppDeepLink', () => {
  it('menerima URL ber-scheme aplikasi', () => {
    expect(isAppDeepLink('netmanager://work-order')).toBe(true);
    expect(isAppDeepLink('netmanager://work-order-detail/abc12345')).toBe(true);
    expect(isAppDeepLink('netmanager:///work-order-detail/abc12345')).toBe(true);
  });

  it('menerima scheme aplikasi tanpa peduli huruf besar-kecil', () => {
    expect(isAppDeepLink('NetManager://dashboard')).toBe(true);
  });

  it('menerima URL relatif tanpa scheme', () => {
    expect(isAppDeepLink('/work-order')).toBe(true);
    expect(isAppDeepLink('work-order-detail/abc12345')).toBe(true);
  });

  // Inilah URL yang memicu warning palsu: Expo dev client mengirimnya setiap
  // app dibuka, dan ia bukan deep link aplikasi sama sekali.
  it('menolak URL dev client Expo', () => {
    expect(
      isAppDeepLink(
        'exp+netmanager://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
      ),
    ).toBe(false);
  });

  it('menolak scheme pihak lain', () => {
    expect(isAppDeepLink('https://contoh.test/work-order')).toBe(false);
    expect(isAppDeepLink('exp://127.0.0.1:8081')).toBe(false);
    expect(isAppDeepLink('netmanager-lain://work-order')).toBe(false);
  });
});
