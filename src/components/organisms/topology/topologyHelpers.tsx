/**
 * Pure helpers untuk layar topology-map.
 * Diekstrak dari app/(app)/topology-map.tsx agar screen tidak jadi god file.
 * Semua fungsi di sini murni (tanpa state) → behavior identik dengan sebelumnya.
 */
import React from "react";
import { Box, Disc, Flag, Home, MapPin, Server, Square } from "lucide-react-native";
import { DeviceType } from "./DeviceDetailModal";

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
