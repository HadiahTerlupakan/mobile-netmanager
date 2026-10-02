/**
 * Logika geo murni layar topology: batas sebaran perangkat, waypoint kabel,
 * dan garis koneksi untuk peta web.
 */
import type {
  LngLat,
  MapBounds,
  TopologyData,
  TopologyEdge,
  WebTopologyDevice,
  WebTopologyLine,
} from "@/components/organisms/topology/topologyTypes";
import { logger } from "@/utils/logger";

/** Warna garis bila edge tidak punya warna & pasangan tipe tak dikenali. */
export const DEFAULT_LINE_COLOR = "#FF0000";

/** Kotak batas wilayah Indonesia; koordinat di luar dianggap data rusak. */
export const INDONESIA_BOUNDS = {
  minLongitude: 95,
  maxLongitude: 141,
  minLatitude: -11,
  maxLatitude: 6,
} as const;

/** Latitude valid maksimal; nilai lebih besar menandakan urutan [lat, lng] tertukar. */
const MAX_ABSOLUTE_LATITUDE = 90;

/** True bila koordinat berupa angka dan berada di wilayah Indonesia. */
export function isWithinIndonesia(longitude: unknown, latitude: unknown): boolean {
  return (
    typeof longitude === "number" &&
    typeof latitude === "number" &&
    longitude >= INDONESIA_BOUNDS.minLongitude &&
    longitude <= INDONESIA_BOUNDS.maxLongitude &&
    latitude >= INDONESIA_BOUNDS.minLatitude &&
    latitude <= INDONESIA_BOUNDS.maxLatitude
  );
}

/** Pusat & batas seluruh perangkat (inventaris + node) yang berada di Indonesia. */
export function computeMapBounds(data: TopologyData | null | undefined): MapBounds | null {
  if (!data) return null;

  const coordinates: LngLat[] = [
    ...data.otbs,
    ...data.odcs,
    ...data.odps,
    ...data.joinboxes,
    ...data.poles,
    ...data.pelanggans,
    ...(data.nodes || []),
  ]
    .map((device): LngLat => [device.longitude, device.latitude])
    .filter(([longitude, latitude]) => isWithinIndonesia(longitude, latitude));

  if (coordinates.length === 0) return null;

  const longitudes = coordinates.map((coordinate) => coordinate[0]);
  const latitudes = coordinates.map((coordinate) => coordinate[1]);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);

  return {
    center: [(west + east) / 2, (south + north) / 2],
    bounds: { ne: [east, north], sw: [west, south] },
  };
}

/** Waypoint edge bisa datang sebagai JSON string; kembalikan nilai ter-parse ([] bila rusak). */
export function parseEdgeWaypoints(edge: Pick<TopologyEdge, "id" | "waypoints">): unknown {
  const rawWaypoints: unknown = edge.waypoints;
  if (typeof rawWaypoints !== "string") return rawWaypoints;
  try {
    return JSON.parse(rawWaypoints);
  } catch (error) {
    logger.error(`Failed to parse waypoints for edge ${edge.id || "unknown"}:`, error);
    return [];
  }
}

type WaypointObject = { longitude?: number; lng?: number; latitude?: number; lat?: number };

/**
 * Normalisasi satu waypoint menjadi [lng, lat]. Array [lat, lng] dideteksi
 * dan ditukar; objek {longitude|lng, latitude|lat} juga diterima.
 */
export function normalizeWaypoint(waypoint: unknown): LngLat {
  if (Array.isArray(waypoint)) {
    const first = Number(waypoint[0]);
    const second = Number(waypoint[1]);
    const isLatLngOrder =
      Math.abs(second) > Math.abs(first) && Math.abs(second) > MAX_ABSOLUTE_LATITUDE;
    return isLatLngOrder ? [second, first] : [first, second];
  }
  const point = (waypoint ?? {}) as WaypointObject;
  return [Number(point.longitude ?? point.lng ?? 0), Number(point.latitude ?? point.lat ?? 0)];
}

/** Garis koneksi peta web: titik sumber → waypoint array → titik tujuan. */
export function buildWebLines(
  data: TopologyData | null | undefined,
  webDevices: WebTopologyDevice[],
): WebTopologyLine[] {
  if (!data || !data.edges) return [];

  return data.edges.flatMap((edge): WebTopologyLine[] => {
    const sourceDevice = webDevices.find((device) => String(device.id) === String(edge.source));
    const targetDevice = webDevices.find((device) => String(device.id) === String(edge.target));
    if (!sourceDevice || !targetDevice) return [];

    const coordinates: LngLat[] = [[sourceDevice.longitude, sourceDevice.latitude]];
    const waypoints = parseEdgeWaypoints(edge);
    if (Array.isArray(waypoints)) {
      waypoints.forEach((waypoint: unknown) => {
        if (Array.isArray(waypoint)) coordinates.push([waypoint[0], waypoint[1]]);
      });
    }
    coordinates.push([targetDevice.longitude, targetDevice.latitude]);

    return [
      {
        id: edge.id,
        coordinates,
        color: edge.color || DEFAULT_LINE_COLOR,
        sourceName: sourceDevice.name,
        targetName: targetDevice.name,
      },
    ];
  });
}
