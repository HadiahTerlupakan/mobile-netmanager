import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useHitungMundurPembayaran } from '@/hooks/tagihan/useHitungMundurPembayaran';

/**
 * Hitung mundur dulu tidak pernah menghentikan intervalnya: setelah lewat
 * batas, `onHabis` (refetch tagihan) terpanggil setiap detik — juga saat tab
 * Tagihan tertutup tab lain — dan lencananya berbunyi "Sisa Kadaluarsa".
 */

const SEKARANG = new Date('2026-10-31T10:00:00.000Z').getTime();
const DETIK = 1000;
const MENIT = 60 * DETIK;
const JAM = 60 * MENIT;

const render = (kedaluwarsa: string | null, onHabis = jest.fn()) =>
  renderHook(({ batas }: { batas: string | null }) => useHitungMundurPembayaran(batas, onHabis), {
    initialProps: { batas: kedaluwarsa },
  });

const setelah = (ms: number) => new Date(SEKARANG + ms).toISOString();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(SEKARANG);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useHitungMundurPembayaran', () => {
  it('menghitung mundur ke batas waktu dari server', () => {
    const { result } = render(setelah(61 * MENIT));
    expect(result.current).toEqual({ sisa: '01:01:00', isKedaluwarsa: false });

    act(() => jest.advanceTimersByTime(DETIK));

    expect(result.current.sisa).toBe('01:00:59');
  });

  it('batas lebih dari 24 jam tidak kehilangan harinya', () => {
    const { result } = render(setelah(24 * JAM + 5 * DETIK));

    expect(result.current.sisa).toBe('24:00:05');
  });

  it('saat habis memanggil onHabis sekali lalu berhenti', () => {
    const onHabis = jest.fn();
    const { result } = render(setelah(2 * DETIK), onHabis);

    act(() => jest.advanceTimersByTime(10 * DETIK));

    expect(onHabis).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ sisa: '', isKedaluwarsa: true });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('checkout yang sudah lewat batas saat dibuka langsung kedaluwarsa tanpa memuat ulang', () => {
    const onHabis = jest.fn();
    const { result } = render(setelah(-MENIT), onHabis);

    act(() => jest.advanceTimersByTime(5 * DETIK));

    expect(result.current.isKedaluwarsa).toBe(true);
    expect(onHabis).not.toHaveBeenCalled();
  });

  it('tanpa batas waktu tidak menghitung', () => {
    const { result } = render(null);

    expect(result.current).toEqual({ sisa: '', isKedaluwarsa: false });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('checkout baru setelah kedaluwarsa dihitung lagi dari awal', () => {
    const { result, rerender } = render(setelah(-MENIT));

    rerender({ batas: setelah(15 * MENIT) });

    expect(result.current).toEqual({ sisa: '00:15:00', isKedaluwarsa: false });
  });
});
