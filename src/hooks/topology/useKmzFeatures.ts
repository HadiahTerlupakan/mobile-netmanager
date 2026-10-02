import { useEffect, useMemo, useRef, useState } from "react";

import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  TopologyData,
  TopologyKmzFile,
} from "@/components/organisms/topology/topologyTypes";
import api from "@/services/api";
import { logger } from "@/utils/logger";
import {
  getKmzCacheKey,
  isAbsoluteKmlPath,
  parseKmlFeatures,
  resolveKmlUrl,
  styleKmzFeatures,
} from "@/utils/topology/kmz";

/** Beri kesempatan UI menggambar frame sebelum kerja berat. */
const waitForNextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
/** Lepas ke event loop agar parsing tidak memblokir thread utama. */
const yieldToEventLoop = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Unduh teks KML; path internal lewat `api` agar token ikut terkirim. */
async function fetchKmlText(kmlPath: string): Promise<string> {
  if (isAbsoluteKmlPath(kmlPath)) {
    const response = await fetch(kmlPath);
    return response.text();
  }
  const response = await api.get<unknown>(kmlPath, { responseType: "text" });
  return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
}

/** Unduh, parse, dan warnai satu berkas KMZ; null bila KML tanpa fitur. */
async function loadKmzFile(file: TopologyKmzFile): Promise<GeoJSONFeature[] | null> {
  logger.info(`Fetching KML from: ${resolveKmlUrl(file.kmlPath, api.defaults.baseURL)}`);
  await waitForNextFrame();
  const kmlText = await fetchKmlText(file.kmlPath);
  await yieldToEventLoop();
  const features = parseKmlFeatures(kmlText);
  return features ? styleKmzFeatures(features, file) : null;
}

/**
 * Muat garis KMZ/KML dari data topologi secara berurutan, dengan cache per
 * berkas agar refetch data tidak mengunduh ulang KML yang sama.
 */
export function useKmzFeatures(data: TopologyData | undefined) {
  const [kmzFeatures, setKmzFeatures] = useState<GeoJSONFeature[]>([]);
  const [isLoadingKmz, setIsLoadingKmz] = useState(false);
  const kmzCacheRef = useRef<Map<string, GeoJSONFeature[]>>(new Map());

  useEffect(() => {
    if (!data) return;
    const kmzFiles = data.kmzFiles;
    if (!kmzFiles || kmzFiles.length === 0) {
      setKmzFeatures([]);
      return;
    }

    async function loadAllKmzFiles(files: TopologyKmzFile[]) {
      logger.info("Loading KMZ files:", files.length);
      setIsLoadingKmz(true);
      const allFeatures: GeoJSONFeature[] = [];

      for (const file of files) {
        if (!file.kmlPath) continue;
        const cacheKey = getKmzCacheKey(file);
        const cachedFeatures = kmzCacheRef.current.get(cacheKey);
        if (cachedFeatures) {
          logger.info(`Using cached KMZ: ${file.name}`);
          allFeatures.push(...cachedFeatures);
          continue;
        }
        try {
          const features = await loadKmzFile(file);
          if (!features) continue;
          kmzCacheRef.current.set(cacheKey, features);
          allFeatures.push(...features);
        } catch (error) {
          logger.error(`Error loading KML ${file.name}:`, error);
        }
      }

      logger.info(`Loaded ${allFeatures.length} KMZ features`);
      setKmzFeatures(allFeatures);
      setIsLoadingKmz(false);
    }

    loadAllKmzFiles(kmzFiles);
  }, [data]);

  const kmzGeoJson = useMemo(
    (): GeoJSONFeatureCollection => ({ type: "FeatureCollection", features: kmzFeatures }),
    [kmzFeatures],
  );

  return { kmzGeoJson, isLoadingKmz };
}
