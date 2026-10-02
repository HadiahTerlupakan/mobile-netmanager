import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CameraSettings,
  LngLat,
  MapBounds,
  MapCameraHandle,
} from "@/components/organisms/topology/topologyTypes";

/** Zoom saat kamera diarahkan ke satu perangkat. */
export const DEVICE_FOCUS_ZOOM = 18;
/** Zoom default flyToCoordinate bila tidak ditentukan. */
export const DEFAULT_FLY_ZOOM = 17;
/** Zoom saat kamera berpusat di lokasi pengguna. */
export const USER_LOCATION_ZOOM = 16;
/** Zoom awal saat kamera berpusat di sebaran perangkat. */
export const DEVICE_BOUNDS_ZOOM = 14;
/** Durasi animasi kamera standar. */
export const CAMERA_ANIMATION_MS = 800;

/**
 * Kendali kamera peta native: posisi awal (lokasi pengguna, lalu sebaran
 * perangkat) dan animasi terbang ke koordinat/lokasi pengguna.
 */
export function useTopologyCamera(userLocation: LngLat | null, mapBounds: MapBounds | null) {
  const cameraRef = useRef<MapCameraHandle>(null);
  const [initialCamera, setInitialCamera] = useState<CameraSettings | null>(null);

  useEffect(() => {
    if (initialCamera) return;
    if (userLocation) {
      setInitialCamera({ centerCoordinate: userLocation, zoomLevel: USER_LOCATION_ZOOM });
      return;
    }
    if (mapBounds) {
      setInitialCamera({ centerCoordinate: mapBounds.center, zoomLevel: DEVICE_BOUNDS_ZOOM });
    }
  }, [userLocation, mapBounds, initialCamera]);

  const flyToCoordinate = useCallback(
    (
      longitude: number,
      latitude: number,
      zoomLevel = DEFAULT_FLY_ZOOM,
      animationDuration = CAMERA_ANIMATION_MS,
    ) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [Number(longitude), Number(latitude)],
        zoomLevel,
        animationDuration,
      });
    },
    [],
  );

  const centerOnUser = useCallback(() => {
    if (!userLocation) return;
    cameraRef.current?.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: USER_LOCATION_ZOOM,
      animationDuration: CAMERA_ANIMATION_MS,
    });
  }, [userLocation]);

  return { cameraRef, initialCamera, flyToCoordinate, centerOnUser };
}
