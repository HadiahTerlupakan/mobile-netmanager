import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import {
  CAMERA_ANIMATION_MS,
  DEFAULT_FLY_ZOOM,
  DEVICE_BOUNDS_ZOOM,
  USER_LOCATION_ZOOM,
  useTopologyCamera,
} from '@/hooks/topology/useTopologyCamera';
import type { LngLat, MapBounds } from '@/components/organisms/topology/topologyTypes';

const mapBounds: MapBounds = { center: [106.8, -6.2], bounds: { ne: [106.9, -6.1], sw: [106.7, -6.3] } };
const userLocation: LngLat = [106.5, -6.5];

type CameraProps = { location: LngLat | null; bounds: MapBounds | null };

describe('useTopologyCamera', () => {
  it('mengutamakan lokasi pengguna untuk posisi awal kamera', () => {
    const { result } = renderHook(() => useTopologyCamera(userLocation, mapBounds));
    expect(result.current.initialCamera).toEqual({ centerCoordinate: userLocation, zoomLevel: USER_LOCATION_ZOOM });
  });

  it('memakai pusat sebaran perangkat bila lokasi belum ada, dan tidak berubah setelahnya', () => {
    const { result, rerender } = renderHook(
      ({ location, bounds }: CameraProps) => useTopologyCamera(location, bounds),
      { initialProps: { location: null, bounds: mapBounds } as CameraProps },
    );
    expect(result.current.initialCamera).toEqual({ centerCoordinate: [106.8, -6.2], zoomLevel: DEVICE_BOUNDS_ZOOM });

    rerender({ location: userLocation, bounds: mapBounds });
    expect(result.current.initialCamera?.centerCoordinate).toEqual([106.8, -6.2]);
  });

  it('menunggu sampai ada lokasi atau sebaran perangkat', () => {
    const { result } = renderHook(() => useTopologyCamera(null, null));
    expect(result.current.initialCamera).toBeNull();
  });

  it('menerbangkan kamera ke koordinat dan ke lokasi pengguna', () => {
    const setCamera = jest.fn();
    const { result } = renderHook(() => useTopologyCamera(userLocation, null));
    result.current.cameraRef.current = { setCamera };

    act(() => result.current.flyToCoordinate(106.8, -6.2));
    expect(setCamera).toHaveBeenLastCalledWith({
      centerCoordinate: [106.8, -6.2],
      zoomLevel: DEFAULT_FLY_ZOOM,
      animationDuration: CAMERA_ANIMATION_MS,
    });

    act(() => result.current.centerOnUser());
    expect(setCamera).toHaveBeenLastCalledWith({
      centerCoordinate: userLocation,
      zoomLevel: USER_LOCATION_ZOOM,
      animationDuration: CAMERA_ANIMATION_MS,
    });
  });

  it('aman dipanggil sebelum kamera ter-mount', () => {
    const { result } = renderHook(() => useTopologyCamera(null, null));
    expect(() => result.current.flyToCoordinate(1, 2)).not.toThrow();
    expect(() => result.current.centerOnUser()).not.toThrow();
  });
});
