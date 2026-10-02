import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { useMuatHalamanBerikutnya } from '@/hooks/useMuatHalamanBerikutnya';

const kueri = (ubah: { hasNextPage?: boolean; isFetchingNextPage?: boolean } = {}) => ({
  hasNextPage: true,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(() => Promise.resolve()),
  ...ubah,
});

describe('useMuatHalamanBerikutnya', () => {
  it('memuat halaman berikutnya bila masih ada', () => {
    const k = kueri();
    renderHook(() => useMuatHalamanBerikutnya(k)).result.current();
    expect(k.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('diam bila halaman habis atau sedang memuat', () => {
    const habis = kueri({ hasNextPage: false });
    const sedangMuat = kueri({ isFetchingNextPage: true });
    renderHook(() => useMuatHalamanBerikutnya(habis)).result.current();
    renderHook(() => useMuatHalamanBerikutnya(sedangMuat)).result.current();
    expect(habis.fetchNextPage).not.toHaveBeenCalled();
    expect(sedangMuat.fetchNextPage).not.toHaveBeenCalled();
  });
});
