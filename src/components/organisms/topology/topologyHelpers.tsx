/**
 * Helper presentasi layar topology-map: warna & ikon perangkat, warna garis,
 * serta builder GeoJSON/marker yang bergantung pada palet perangkat.
 * Semua fungsi di sini murni (tanpa state).
 */
import React from "react";
import { Box, Disc, Flag, Home, MapPin, Server, Square } from "lucide-react-native";
import {
  ConnectionLineFeature,
  DeviceFeature,
  DeviceType,
  GeoJSONFeatureCollection,
  InventoryDeviceType,
  TopologyData,
  TopologyNode,
  VisibilityState,
  WebTopologyDevice,
} from "./topologyTypes";
import { calculateDistance } from "@/utils/geo";
import { DEFAULT_LINE_COLOR, normalizeWaypoint, parseEdgeWaypoints } from "@/utils/topology/topologyGeo";
import {
  getDeviceDisplayName,
  getInventoryDevices,
  InventoryDeviceRecord,
  mapNodeTypeToDeviceType,
} from "@/utils/topology/topologyDevices";

// Tipe GeoJSON kini tinggal di topologyTypes; di-re-export agar import lama tetap berlaku.
export type { GeoJSONFeature, GeoJSONFeatureCollection } from "./topologyTypes";

export const MARKER_COLORS: Record<DeviceType, string> = {
  otb: "#9333ea", // Purple
  odc: "#2563eb", // Blue
  odp: "#06b6d4", // Cyan
  joinbox: "#a855f7", // purple
  pole: "#6b7280", // gray
  pelanggan: "#ea580c", // Orange
  kmz: "#6366f1", // indigo
};

/** Warna garis per segmen jaringan. */
export const LINE_COLORS = {
  feeder: "#D946EF", // Server/OTB/OLT ↔ ODC
  distribution: "#00FFFF", // ODC ↔ ODP
  drop: "#39FF14", // ODP ↔ Pelanggan/ONT
} as const;

/** Urutan gambar koleksi inventaris di peta (dipertahankan dari implementasi lama). */
const DRAW_INVENTORY_ORDER: InventoryDeviceType[] = [
  "otb",
  "odc",
  "odp",
  "joinbox",
  "pole",
  "pelanggan",
];

const HEAD_END_TYPES = ["otb", "server", "olt"];
const CUSTOMER_END_TYPES = ["pelanggan", "ont"];
const RANDOM_ID_RADIX = 36;
const RANDOM_ID_START = 2;
const RANDOM_ID_END = 11;

/** Ikon marker per tipe perangkat. */
export const getDeviceIcon = (type: DeviceType, size: number = 16, color: string = "white") => {
  switch (type) {
    case "otb":
      return <Server size={size} color={color} />;
    case "odc":
      return <Box size={size} color={color} />;
    case "odp":
      return <Disc size={size} color={color} />;
    case "joinbox":
      return <Square size={size} color={color} />;
    case "pole":
      return <Flag size={size} color={color} />;
    case "pelanggan":
      return <Home size={size} color={color} />;
    default:
      return <MapPin size={size} color={color} />;
  }
};

/** True bila salah satu ujung bertipe `a` dan ujung lain bertipe `b`. */
const connectsTypes = (source: string, target: string, a: string[], b: string[]): boolean =>
  (a.includes(source) && b.includes(target)) || (a.includes(target) && b.includes(source));

/** Warna garis koneksi berdasarkan pasangan tipe perangkat (feeder/distribution/drop). */
export const getLineColor = (sourceType: string, targetType: string, defaultColor?: string): string => {
  const source = sourceType?.toLowerCase() || "";
  const target = targetType?.toLowerCase() || "";

  if (connectsTypes(source, target, HEAD_END_TYPES, ["odc"])) return LINE_COLORS.feeder;
  if (connectsTypes(source, target, ["odc"], ["odp"])) return LINE_COLORS.distribution;
  if (connectsTypes(source, target, ["odp"], CUSTOMER_END_TYPES)) return LINE_COLORS.drop;
  return defaultColor || DEFAULT_LINE_COLOR;
};

/** ID acak untuk perangkat tanpa id (data rusak) agar tetap bisa digambar. */
const createFallbackId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(RANDOM_ID_RADIX).slice(RANDOM_ID_START, RANDOM_ID_END)}`;

const toInventoryFeature = (device: InventoryDeviceRecord, type: DeviceType): DeviceFeature => {
  const safeId = device.id ? String(device.id) : createFallbackId(`fallback-${type}`);
  return {
    type: "Feature",
    id: type + "-" + safeId,
    properties: {
      id: safeId,
      originalId: device.id,
      type,
      color: MARKER_COLORS[type],
      name: getDeviceDisplayName(device, "Tanpa Nama"),
      source: "inventory",
      notes: device.notes,
      capacity: device.capacity,
      splitter: device.splitter,
      serialNumber: device.serialNumber,
      pppoe: device.pppoe,
      attenuationIn: device.attenuationInput,
      attenuationOut: device.attenuationOutput,
      usedSlots: device.usedSlots,
      inputCoreColor: device.inputCoreColor,
      photo: device.photo,
      parent: device.parent,
    },
    geometry: { type: "Point", coordinates: [device.longitude, device.latitude] },
  };
};

const toNodeFeature = (node: TopologyNode, type: DeviceType): DeviceFeature => {
  const safeId = node.nodeId ? String(node.nodeId) : createFallbackId("node-fallback");
  return {
    type: "Feature",
    id: `node-${safeId}`,
    properties: {
      id: safeId,
      originalId: node.nodeId,
      type,
      color: MARKER_COLORS[type],
      name: node.name || "Node Tanpa Nama",
      source: "mapping-node",
      originalType: node.type || "unknown",
      notes: node.notes,
      description: node.description,
      capacity: node.capacity,
      splitter: node.splitter,
      serialNumber: node.serialNumber,
      pppoe: node.pppoe,
      attenuationIn: node.attenuationIn,
      attenuationOut: node.attenuationOut,
      usedSlots: node.usedSlots,
      inputCoreColor: node.inputCoreColor,
      photo: node.photo,
      parent: node.parent,
    },
    geometry: { type: "Point", coordinates: [node.longitude, node.latitude] },
  };
};

/**
 * Bangun FeatureCollection titik perangkat dari data topologi, menghormati
 * state visibility. Perangkat tanpa koordinat dilewati.
 */
export const buildDevicesGeoJson = (
  data: TopologyData | null | undefined,
  visibility: VisibilityState,
): GeoJSONFeatureCollection<DeviceFeature> => {
  if (!data) return { type: "FeatureCollection", features: [] };

  const features: DeviceFeature[] = [];
  DRAW_INVENTORY_ORDER.filter((type) => visibility[type]).forEach((type) => {
    getInventoryDevices(data, type).forEach((device) => {
      if (!device.longitude || !device.latitude) return;
      features.push(toInventoryFeature(device, type));
    });
  });

  data.nodes?.forEach((node) => {
    if (!node.longitude || !node.latitude) return;
    const mappedType = mapNodeTypeToDeviceType(node.type);
    if (visibility[mappedType]) features.push(toNodeFeature(node, mappedType));
  });

  return { type: "FeatureCollection", features };
};

/**
 * Bangun FeatureCollection garis koneksi antar-perangkat dari edges,
 * memakai titik-titik yang sudah terlihat (deviceFeatures).
 */
export const buildConnectionLines = (
  data: TopologyData | null | undefined,
  deviceFeatures: DeviceFeature[],
  linesVisible: boolean,
): GeoJSONFeatureCollection<ConnectionLineFeature> => {
  if (!data || !data.edges || !linesVisible) return { type: "FeatureCollection", features: [] };

  const findFeature = (originalId: string) =>
    deviceFeatures.find((feature) => String(feature.properties?.originalId) === originalId);

  const features: ConnectionLineFeature[] = [];
  data.edges.forEach((edge) => {
    if (!edge) return;

    const sourceFeature = findFeature(String(edge.source));
    const targetFeature = findFeature(String(edge.target));
    // Node tidak ketemu (terfilter/corrupt) → lewati garis ini.
    if (!sourceFeature || !targetFeature) return;

    const sourceCoords = sourceFeature.geometry.coordinates;
    const targetCoords = targetFeature.geometry.coordinates;
    if (!sourceCoords || !targetCoords) return;

    const waypoints = parseEdgeWaypoints(edge);
    const waypointCoords = Array.isArray(waypoints) ? waypoints.map(normalizeWaypoint) : [];

    const distanceInMeters = Math.round(
      calculateDistance(sourceCoords[1], sourceCoords[0], targetCoords[1], targetCoords[0]),
    );

    features.push({
      type: "Feature",
      properties: {
        edgeId: edge.id,
        color: getLineColor(sourceFeature.properties?.type, targetFeature.properties?.type, edge.color),
        sourceName: sourceFeature.properties?.name || "Unknown",
        targetName: targetFeature.properties?.name || "Unknown",
        distance: `${distanceInMeters}m`,
      },
      geometry: {
        type: "LineString",
        coordinates: [sourceCoords, ...waypointCoords, targetCoords],
      },
    });
  });

  return { type: "FeatureCollection", features };
};

/** Marker perangkat untuk WebMapView (inventaris + MappingNode berkoordinat). */
export const buildWebDevices = (data: TopologyData | null | undefined): WebTopologyDevice[] => {
  if (!data) return [];

  const devices: WebTopologyDevice[] = [];
  const addDevice = (device: InventoryDeviceRecord, type: DeviceType) => {
    if (!device.longitude || !device.latitude) return;
    devices.push({
      type,
      id: device.id || device.nodeId || "",
      name: getDeviceDisplayName(device, "Unknown"),
      latitude: device.latitude,
      longitude: device.longitude,
      color: MARKER_COLORS[type],
      properties: device,
    });
  };

  DRAW_INVENTORY_ORDER.forEach((type) =>
    getInventoryDevices(data, type).forEach((device) => addDevice(device, type)),
  );
  data.nodes?.forEach((node) =>
    addDevice({ ...node, id: node.nodeId }, mapNodeTypeToDeviceType(node.type)),
  );

  return devices;
};
