/**
 * Pure helpers untuk layar topology-map.
 * Diekstrak dari app/(app)/topology-map.tsx agar screen tidak jadi god file.
 * Semua fungsi di sini murni (tanpa state) → behavior identik dengan sebelumnya.
 */
import React from "react";
import { Box, Disc, Flag, Home, MapPin, Server, Square } from "lucide-react-native";
import { DeviceType } from "./DeviceDetailModal";
import { TopologyData, VisibilityState } from "./topologyTypes";
import { calculateDistance } from "@/utils/geo";
import { logger } from "@/utils/logger";

// GeoJSON types
export type GeoJSONFeature = {
  type: "Feature";
  id?: string | number;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
};

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

export const MARKER_COLORS: Record<DeviceType, string> = {
  otb: "#9333ea", // Purple
  odc: "#2563eb", // Blue
  odp: "#06b6d4", // Cyan
  joinbox: "#a855f7", // purple
  pole: "#6b7280", // gray
  pelanggan: "#ea580c", // Orange
  kmz: "#6366f1", // indigo
};

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

/** Warna garis koneksi berdasarkan pasangan tipe perangkat (feeder/distribution/drop). */
export const getLineColor = (sourceType: string, targetType: string, defaultColor?: string): string => {
  const s = sourceType?.toLowerCase() || "";
  const t = targetType?.toLowerCase() || "";

  // Feeder: Server/OTB -> ODC (Purple)
  if (
    ((s === "otb" || s === "server" || s === "olt") && t === "odc") ||
    ((t === "otb" || t === "server" || t === "olt") && s === "odc")
  ) {
    return "#D946EF";
  }

  // Distribution: ODC -> ODP (Blue)
  if (
    (s === "odc" && t === "odp") ||
    (t === "odc" && s === "odp")
  ) {
    return "#00FFFF";
  }

  // Drop: ODP -> Pelanggan (Green)
  if (
    (s === "odp" && (t === "pelanggan" || t === "ont")) ||
    (t === "odp" && (s === "pelanggan" || s === "ont"))
  ) {
    return "#39FF14";
  }

  return defaultColor || "#FF0000";
};

/**
 * Bangun FeatureCollection titik perangkat dari data topologi, menghormati
 * state visibility. Fungsi murni — dulu inline useMemo di topology-map.
 */
export const buildDevicesGeoJson = (
  data: TopologyData | null | undefined,
  visibility: VisibilityState,
): GeoJSONFeatureCollection => {
  if (!data) return { type: "FeatureCollection", features: [] };

  const features: GeoJSONFeature[] = [];
  const addFeature = (d: any, type: DeviceType, color: string) => {
    // PERMISIF: Skip hanya jika koordinat null/0
    if (!d.longitude || !d.latitude) return;

    // PERMISIF: Fallback ID jika data.id kosong
    const safeId = d.id ? String(d.id) : `fallback-${type}-${Math.random().toString(36).substr(2, 9)}`;

    features.push({
      type: "Feature",
      id: type + "-" + safeId,
      properties: {
        id: safeId,
        originalId: d.id, // STORE ORIGINAL ID
        type: type,
        color: color || "#9ca3af",
        name: d.name || d.nama || d.idPelanggan || "Tanpa Nama",
        source: "inventory",
        // Map all details for the modal
        notes: d.notes,
        capacity: d.capacity,
        splitter: d.splitter,
        serialNumber: d.serialNumber,
        pppoe: d.pppoe,
        attenuationIn: d.attenuationInput,
        attenuationOut: d.attenuationOutput,
        usedSlots: d.usedSlots,
        inputCoreColor: d.inputCoreColor,
        photo: d.photo,
        parent: d.parent,
      },
      geometry: {
        type: "Point",
        coordinates: [d.longitude, d.latitude],
      },
    });
  };

  if (visibility.otb)
    data.otbs.forEach((d) => addFeature(d, "otb", MARKER_COLORS.otb));
  if (visibility.odc)
    data.odcs.forEach((d) => addFeature(d, "odc", MARKER_COLORS.odc));
  if (visibility.odp)
    data.odps.forEach((d) => addFeature(d, "odp", MARKER_COLORS.odp));
  if (visibility.joinbox)
    data.joinboxes.forEach((d) =>
      addFeature(d, "joinbox", MARKER_COLORS.joinbox),
    );
  if (visibility.pole)
    data.poles.forEach((d) => addFeature(d, "pole", MARKER_COLORS.pole));
  if (visibility.pelanggan)
    data.pelanggans.forEach((d) =>
      addFeature(d, "pelanggan", MARKER_COLORS.pelanggan),
    );

  // Render nodes from MappingNode
  if (data.nodes) {
    data.nodes.forEach((node) => {
      // PERMISIF: Cek koordinat
      if (!node.longitude || !node.latitude) return;

      // PERMISIF: Fallback ID
      const safeId = node.nodeId ? String(node.nodeId) : `node-fallback-${Math.random().toString(36).substr(2, 9)}`;

      let mappedType: DeviceType = "pole"; // Default fallback
      let color = MARKER_COLORS.pole;

      // Map node types to device types and colors
      if (node.type) {
        switch (node.type.toLowerCase()) {
          case "server":
            mappedType = "otb"; // Icon Server, Warna Ungu
            color = MARKER_COLORS.otb;
            break;
          case "odc":
            mappedType = "odc"; // Icon Box, Warna Biru
            color = MARKER_COLORS.odc;
            break;
          case "odp":
            mappedType = "odp"; // Icon Disc, Warna Cyan
            color = MARKER_COLORS.odp;
            break;
          case "ont":
            mappedType = "pelanggan"; // Icon Home, Warna Oranye
            color = MARKER_COLORS.pelanggan;
            break;
        }
      }

      if (mappedType && visibility[mappedType]) {
        features.push({
          type: "Feature",
          id: `node-${safeId}`,
          properties: {
            id: safeId,
            originalId: node.nodeId, // STORE ORIGINAL ID
            type: mappedType,
            color: color,
            name: node.name || "Node Tanpa Nama",
            source: "mapping-node",
            originalType: node.type || "unknown",
            // Map all details for the modal
            notes: node.notes, // Use notes from backend
            description: node.description, // Fallback
            capacity: node.capacity,
            splitter: node.splitter,
            serialNumber: node.serialNumber, // Note: node.serialNumber (camelCase)
            pppoe: node.pppoe,
            attenuationIn: node.attenuationIn,
            attenuationOut: node.attenuationOut,
            usedSlots: node.usedSlots,
            inputCoreColor: node.inputCoreColor,
            photo: node.photo,
            parent: node.parent,
          },
          geometry: {
            type: "Point",
            coordinates: [node.longitude, node.latitude],
          },
        });
      }
    });
  }

  return { type: "FeatureCollection", features };
};

/**
 * Bangun FeatureCollection garis koneksi antar-perangkat dari edges,
 * memakai titik-titik yang sudah terlihat (deviceFeatures). Fungsi murni.
 */
export const buildConnectionLines = (
  data: TopologyData | null | undefined,
  deviceFeatures: GeoJSONFeature[],
  linesVisible: boolean,
): GeoJSONFeatureCollection => {
  if (!data || !data.edges) return { type: "FeatureCollection", features: [] };

  const features: GeoJSONFeature[] = [];

  // Use visible features for lookup to ensure we only connect to valid/visible nodes
  const allFeatures = deviceFeatures;

  if (!linesVisible) return { type: "FeatureCollection", features: [] };

  data.edges.forEach((edge) => {
    if (!edge) return;

    // 1. Loose ID Comparison (String vs String)
    const sourceIdStr = String(edge.source);
    const targetIdStr = String(edge.target);

    // Find source and target features by their ORIGINAL ID
    const sourceFeature = allFeatures.find(f => String(f.properties?.originalId) === sourceIdStr);
    const targetFeature = allFeatures.find(f => String(f.properties?.originalId) === targetIdStr);

    // Safety Check: Jika node tidak ketemu (terfilter/corrupt), skip garis ini
    if (!sourceFeature || !targetFeature) {
      return;
    }

    const sourceCoords = (sourceFeature.geometry as any).coordinates;
    const targetCoords = (targetFeature.geometry as any).coordinates;

    if (sourceCoords && targetCoords) {
      let coordinates: number[][] = [];

      // Start with Source
      coordinates.push(sourceCoords);

      // Handle JSON String Waypoints (Robust Parsing)
      let waypoints = edge.waypoints;

      if (typeof waypoints === 'string') {
        try {
          waypoints = JSON.parse(waypoints);
        } catch (e) {
          logger.error(`Failed to parse waypoints for edge ${edge.id || 'unknown'}:`, e);
          waypoints = [];
        }
      }

      // Add Waypoints (if any)
      if (waypoints && Array.isArray(waypoints)) {
        const wps = waypoints.map((wp: any) => {
          let lng, lat;

          if (Array.isArray(wp)) {
            // Koordinat GeoJSON: Pastikan [Longitude, Latitude]
            const val0 = Number(wp[0]);
            const val1 = Number(wp[1]);

            // Deteksi format [Lat, Lng] -> Swap jadi [Lng, Lat]
            if (Math.abs(val1) > Math.abs(val0) && Math.abs(val1) > 90) {
              lng = val1;
              lat = val0;
            } else {
              lng = val0;
              lat = val1;
            }
          } else {
            lng = wp.longitude ?? wp.lng ?? 0;
            lat = wp.latitude ?? wp.lat ?? 0;
          }
          return [Number(lng), Number(lat)];
        });
        coordinates.push(...wps);
      }

      // End with Target
      coordinates.push(targetCoords);

      // Determine line color from feature types
      const sourceType = sourceFeature.properties?.type;
      const targetType = targetFeature.properties?.type;
      const color = getLineColor(sourceType, targetType, edge.color);

      // Calculate distance for info (bulatkan ke meter — sama seperti implementasi lama)
      const distance = Math.round(calculateDistance(
        sourceCoords[1],
        sourceCoords[0],
        targetCoords[1],
        targetCoords[0]
      ));

      features.push({
        type: "Feature",
        properties: {
          edgeId: edge.id,
          color: color,
          sourceName: sourceFeature.properties?.name || "Unknown",
          targetName: targetFeature.properties?.name || "Unknown",
          distance: `${distance}m`
        },
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      });
    }
  });

  return { type: "FeatureCollection", features };
};
