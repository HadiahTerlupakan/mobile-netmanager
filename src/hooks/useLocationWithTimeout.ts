import { useCallback } from "react";
import * as Location from "expo-location";
import { logger } from "@/utils/logger";
import { requestForegroundLocationWithDisclosure } from "@/utils/locationDisclosure";

/** Hasil pencarian lokasi; string kosong berarti koordinat tidak didapat. */
export interface LocationResult {
  latitude: string;
  longitude: string;
  locationName: string;
  /** Akurasi horizontal dalam meter, null bila tidak diketahui. */
  accuracy: number | null;
}

const BATAS_TUNGGU_BAWAAN_MS = 15_000;

function keHasil(lokasi: Location.LocationObject | null, locationName: string): LocationResult {
  return {
    latitude: lokasi?.coords.latitude.toString() ?? "",
    longitude: lokasi?.coords.longitude.toString() ?? "",
    locationName,
    accuracy: lokasi?.coords.accuracy ?? null,
  };
}

async function namaLokasi(lokasi: Location.LocationObject): Promise<string> {
  try {
    const hasil = await Location.reverseGeocodeAsync({
      latitude: lokasi.coords.latitude,
      longitude: lokasi.coords.longitude,
    });
    if (hasil.length === 0) return "";
    const alamat = hasil[0];
    const nama = `${alamat.street || ""} ${alamat.district || ""} ${alamat.city || ""}`.trim();
    return nama || alamat.name || alamat.region || "";
  } catch (geoError) {
    logger.error("Geocoding failed:", geoError);
    return "";
  }
}

/**
 * Provides a reusable function to fetch current location with a timeout
 * and reverse geocode it into a human-readable address.
 */
export function useLocationWithTimeout() {
  /**
   * Ambil posisi GPS dengan batas waktu (fix pertama di luar ruangan bisa
   * 10 detik lebih) lalu reverse geocode. Jatuh ke `cachedLocation` bila
   * izin ditolak atau waktu habis. `akurasiGps` default `Balanced` agar
   * pemanggil lama tidak berubah.
   */
  const getLocationWithTimeout = useCallback(
    async (
      cachedLocation: Location.LocationObject | null,
      timeoutMs = BATAS_TUNGGU_BAWAAN_MS,
      akurasiGps: Location.Accuracy = Location.Accuracy.Balanced,
    ): Promise<LocationResult> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const { status } = await requestForegroundLocationWithDisclosure();
        if (status !== "granted") {
          logger.info("Location permission not granted, using cached/last known");
          return keHasil(cachedLocation, "");
        }
        const batasWaktu = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), timeoutMs);
        });
        let posisi: Location.LocationObject | null;
        try {
          posisi = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: akurasiGps }),
            batasWaktu,
          ]);
        } finally {
          // Cegah timer menggantung setelah race selesai, apa pun hasilnya.
          clearTimeout(timer);
        }
        if (!posisi) {
          logger.info("Location fetch timed out, using cached/last known");
          return keHasil(cachedLocation, "");
        }
        return keHasil(posisi, await namaLokasi(posisi));
      } catch (e) {
        logger.error("Could not update location/geocode:", e);
        return keHasil(cachedLocation, "");
      }
    },
    [],
  );

  return { getLocationWithTimeout };
}
