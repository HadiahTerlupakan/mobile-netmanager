/**
 * Logika murni berkas KMZ/KML topology: URL sumber, kunci cache, parsing KML
 * ke GeoJSON, dan pewarnaan fitur.
 */
import { DOMParser } from "@xmldom/xmldom";

import type {
  GeoJSONFeature,
  TopologyKmzFile,
} from "@/components/organisms/topology/topologyTypes";
import toGeoJSON from "@/utils/togeojson-wrapper";

/** Warna garis KMZ bila berkas tidak menentukan warnanya (indigo). */
export const DEFAULT_KMZ_LINE_COLOR = "#6366f1";

/** True bila kmlPath adalah URL penuh (bukan path relatif ke API). */
export function isAbsoluteKmlPath(kmlPath: string): boolean {
  return kmlPath.startsWith("http");
}

/** URL lengkap KML; path relatif digabung ke baseURL API. */
export function resolveKmlUrl(kmlPath: string, baseUrl: string | undefined): string {
  if (isAbsoluteKmlPath(kmlPath)) return kmlPath;
  const separator = kmlPath.startsWith("/") ? "" : "/";
  return `${baseUrl || ""}${separator}${kmlPath}`;
}

/** Kunci cache hasil parsing; berubah bila path KML berkas berganti. */
export function getKmzCacheKey(file: Pick<TopologyKmzFile, "id" | "kmlPath">): string {
  return `${file.id}-${file.kmlPath}`;
}

/** Parse teks KML menjadi fitur GeoJSON mentah; null bila KML tidak berisi fitur. */
export function parseKmlFeatures(kmlText: string): GeoJSONFeature[] | null {
  const kmlDocument = new DOMParser().parseFromString(kmlText, "text/xml");
  const geoJson = toGeoJSON.kml(kmlDocument as unknown as Document);
  return geoJson.features ? (geoJson.features as GeoJSONFeature[]) : null;
}

/** Tambahkan warna & asal berkas ke tiap fitur KMZ (dipakai LineLayer). */
export function styleKmzFeatures(
  features: GeoJSONFeature[],
  file: Pick<TopologyKmzFile, "id" | "name" | "lineColor">,
): GeoJSONFeature[] {
  return features.map((feature) => ({
    ...feature,
    properties: {
      ...(feature.properties || {}),
      color: file.lineColor || DEFAULT_KMZ_LINE_COLOR,
      kmzId: file.id,
      sourceFile: file.name,
    },
  }));
}
