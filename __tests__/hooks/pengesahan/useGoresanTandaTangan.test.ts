import { act, renderHook } from '@testing-library/react-native';
import type { GestureResponderEvent } from 'react-native';

import { useGoresanTandaTangan } from '@/hooks/pengesahan/useGoresanTandaTangan';

const sentuh = (x: number, y: number) =>
  ({ nativeEvent: { locationX: x, locationY: y, touches: [], changedTouches: [] }, touchHistory: { touchBank: [] } }) as unknown as GestureResponderEvent;

describe('useGoresanTandaTangan', () => {
  it('merekam goresan jari sebagai path SVG lalu bisa dihapus', () => {
    const { result } = renderHook(() => useGoresanTandaTangan());
    expect(result.current.isKosong).toBe(true);

    act(() => {
      result.current.panHandlers.onResponderGrant?.(sentuh(10, 20));
      result.current.panHandlers.onResponderMove?.(sentuh(30, 40));
    });

    expect(result.current.isKosong).toBe(false);
    expect(result.current.daftarGoresan).toEqual(['M10.0,20.0 L30.0,40.0']);

    act(() => result.current.hapus());
    expect(result.current.isKosong).toBe(true);
  });

  it('setiap sentuhan baru menjadi goresan terpisah', () => {
    const { result } = renderHook(() => useGoresanTandaTangan());

    act(() => {
      result.current.panHandlers.onResponderGrant?.(sentuh(1, 1));
      result.current.panHandlers.onResponderRelease?.(sentuh(1, 1));
      result.current.panHandlers.onResponderGrant?.(sentuh(5, 5));
    });

    expect(result.current.daftarGoresan).toHaveLength(2);
  });
});
