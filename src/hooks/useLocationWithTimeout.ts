import { useCallback } from "react";
import * as Location from "expo-location";
import { logger } from "@/utils/logger";
import { requestForegroundLocationWithDisclosure } from "@/utils/locationDisclosure";

interface LocationResult {
  latitude: string;
  longitude: string;
  locationName: string;
}

/**
 * Provides a reusable function to fetch current location with a timeout
 * and reverse geocode it into a human-readable address.
 */
export function useLocationWithTimeout() {
  /**
   * Fetches current GPS position (with 15s timeout — GPS first fix di luar
   * ruangan bisa 10s+) dan reverse geocodes hasil. Falls back ke cached
   * location bila fresh fetch timeout.
   */
  const getLocationWithTimeout = useCallback(
    async (
      cachedLocation: Location.LocationObject | null,
      timeoutMs = 15_000,
    ): Promise<LocationResult> => {
      let finalLocation = cachedLocation;
      let locationName = "";

      try {
        // Gerbang disclosure: pastikan izin (didahului disclosure) sebelum akses GPS
        const { status } = await requestForegroundLocationWithDisclosure();
        if (status !== "granted") {
          logger.info("Location permission not granted, using cached/last known");
          return {
            latitude: finalLocation?.coords.latitude.toString() ?? "",
            longitude: finalLocation?.coords.longitude.toString() ?? "",
            locationName,
          };
        }

        const locPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), timeoutMs),
        );

        const result = await Promise.race([locPromise, timeoutPromise]);

        if (result) {
          finalLocation = result as Location.LocationObject;

          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: finalLocation.coords.latitude,
              longitude: finalLocation.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
              const addr = reverseGeocode[0];
              locationName =
                `${addr.street || ""} ${addr.district || ""} ${addr.city || ""}`.trim();
              if (!locationName) locationName = addr.name || addr.region || "";
            }
          } catch (geoError) {
            logger.error("Geocoding failed:", geoError);
          }
        } else {
          logger.info("Location fetch timed out, using cached/last known");
        }
      } catch (e) {
        logger.error("Could not update location/geocode:", e);
      }

      return {
        latitude: finalLocation?.coords.latitude.toString() ?? "",
        longitude: finalLocation?.coords.longitude.toString() ?? "",
        locationName,
      };
    },
    [],
  );

  return { getLocationWithTimeout };
}
