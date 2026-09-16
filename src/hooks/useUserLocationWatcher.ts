import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { RefObject, useCallback, useRef, useState } from "react";

import { logger } from "@/utils/logger";

/** Koordinat [longitude, latitude] — urutan yang dipakai GeoJSON/MapLibre. */
export type LngLat = [number, number];

const LOCATION_ACCURACY = Location.Accuracy.Balanced;
const LOCATION_WATCH_INTERVAL_MS = 30_000;

interface LocationWatchSession {
  isCancelled: () => boolean;
  hasRequestedPermissionRef: RefObject<boolean>;
  onLocation: (location: LngLat) => void;
}

const toLngLat = ({ coords }: Location.LocationObject): LngLat => [
  coords.longitude,
  coords.latitude,
];

/** Minta izin sekali per mount; fokus berikutnya hanya membaca status tanpa memunculkan dialog lagi. */
async function isLocationPermissionGranted(
  hasRequestedPermissionRef: RefObject<boolean>,
): Promise<boolean> {
  if (hasRequestedPermissionRef.current) {
    const { granted } = await Location.getForegroundPermissionsAsync();
    return granted;
  }
  hasRequestedPermissionRef.current = true;
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

/** Ambil posisi awal lalu mulai watcher; null bila izin ditolak atau sesi sudah dibatalkan. */
async function startLocationWatch(
  session: LocationWatchSession,
): Promise<Location.LocationSubscription | null> {
  const isGranted = await isLocationPermissionGranted(session.hasRequestedPermissionRef);
  if (!isGranted || session.isCancelled()) return null;

  const position = await Location.getCurrentPositionAsync({ accuracy: LOCATION_ACCURACY });
  if (session.isCancelled()) return null;
  session.onLocation(toLngLat(position));

  return Location.watchPositionAsync(
    { accuracy: LOCATION_ACCURACY, timeInterval: LOCATION_WATCH_INTERVAL_MS },
    (update) => session.onLocation(toLngLat(update)),
  );
}

/** Nyalakan watcher untuk satu sesi fokus; return cleanup yang melepasnya saat blur. */
function startFocusSession(
  hasRequestedPermissionRef: RefObject<boolean>,
  onLocation: (location: LngLat) => void,
): () => void {
  let isCancelled = false;
  let subscription: Location.LocationSubscription | null = null;

  // Watcher yang baru selesai dibuat setelah blur harus langsung dilepas,
  // karena cleanup di bawah sudah lewat dan tidak akan melihatnya.
  const adoptWatcher = (watcher: Location.LocationSubscription | null) => {
    if (isCancelled) watcher?.remove();
    else subscription = watcher;
  };

  startLocationWatch({ isCancelled: () => isCancelled, hasRequestedPermissionRef, onLocation })
    .then(adoptWatcher)
    .catch((error) => logger.warn("[useUserLocationWatcher] Failed to watch user location:", error));

  return () => {
    isCancelled = true;
    subscription?.remove();
  };
}

/**
 * Lokasi pengguna yang dipantau hanya selama layar sedang fokus.
 *
 * Layar di dalam `<Tabs>` tetap ter-mount setelah ditinggalkan, jadi watcher
 * yang diikat ke mount akan terus menyalakan GPS (dan me-render ulang layar)
 * saat pengguna sudah berada di layar lain.
 */
export function useUserLocationWatcher(): LngLat | null {
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);
  const hasRequestedPermissionRef = useRef(false);

  // Identitas callback harus stabil: useFocusEffect menjalankan ulang efek
  // (dan me-restart watcher) setiap kali fungsi ini berganti.
  useFocusEffect(
    useCallback(() => startFocusSession(hasRequestedPermissionRef, setUserLocation), []),
  );

  return userLocation;
}
