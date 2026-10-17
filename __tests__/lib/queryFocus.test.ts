import { describe, expect, it, jest } from '@jest/globals';
import { focusManager } from '@tanstack/react-query';

import { hubungkanFokusQueryKeAppState } from '@/lib/queryFocus';

describe('hubungkanFokusQueryKeAppState', () => {
  it('menandai aplikasi fokus hanya saat AppState aktif', () => {
    let pendengar: ((keadaan: string) => void) | undefined;
    const hapusLangganan = jest.fn();
    const appStateTiruan = {
      addEventListener: (_jenis: string, fungsi: (keadaan: string) => void) => {
        pendengar = fungsi;
        return { remove: hapusLangganan };
      },
    };
    // focusManager memasang pendengar hanya selama ada pelanggan (QueryClient
    // yang ter-mount); test meniru kondisi aplikasi berjalan.
    const berhentiBerlangganan = focusManager.subscribe(() => undefined);

    hubungkanFokusQueryKeAppState(appStateTiruan as never);

    expect(pendengar).toBeDefined();
    pendengar!('background');
    expect(focusManager.isFocused()).toBe(false);
    pendengar!('active');
    expect(focusManager.isFocused()).toBe(true);

    berhentiBerlangganan();
    expect(hapusLangganan).toHaveBeenCalled();
  });
});
