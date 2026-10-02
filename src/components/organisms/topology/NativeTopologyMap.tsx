import React, { RefObject, useCallback } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { useTemaPersona } from "@/theme";
import { getMapLibre, isMapLibreAvailable } from "@/utils/maplibre";

import { TOPOLOGY_PALETTE } from "./topologyPalette";
import type {
  CameraSettings,
  ConnectionLineFeature,
  DeviceFeature,
  GeoJSONFeatureCollection,
  MapCameraHandle,
  ShapePressEvent,
} from "./topologyTypes";

// MapLibre bernilai null di Expo Go & web.
const MapLibreGL = getMapLibre();

/** True bila peta MapLibre native bisa dirender di runtime ini. */
export const isNativeMapAvailable = isMapLibreAvailable && MapLibreGL !== null;

if (MapLibreGL) {
  MapLibreGL.setAccessToken(null); // Tile terbuka, tidak butuh token
  // Redam error MapLibre untuk resourceUrl kosong; log lain tetap diteruskan.
  MapLibreGL.Logger.setLogCallback((log: { message?: string }) =>
    Boolean(log.message?.includes("Unable to parse resourceUrl")),
  );
}

/** Style peta: tile satelit Google (raster). Konstan agar peta tidak reload. */
const SATELLITE_MAP_STYLE = {
  version: 8,
  sources: {
    google_satellite: {
      type: "raster",
      tiles: ["https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}"],
      tileSize: 256,
      attribution: "© Google Maps",
    },
  },
  layers: [
    {
      id: "google-satellite-tiles",
      type: "raster",
      source: "google_satellite",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const MIN_MAP_ZOOM = 5;
const MAX_MAP_ZOOM = 20;
/** Label nama perangkat baru muncul dari zoom ini agar peta tidak penuh. */
const DEVICE_LABEL_MIN_ZOOM = 14;
/** Area sentuh titik perangkat (lebih besar dari lingkarannya). */
const DEVICE_HITBOX = { width: 36, height: 36 };

const CONNECTION_LINE_STYLE = {
  lineColor: ["get", "color"],
  lineWidth: 4,
  lineOpacity: 1,
};

const KMZ_LINE_STYLE = {
  lineColor: ["get", "color"],
  lineWidth: 3,
  lineOpacity: 0.8,
};

const DEVICE_CIRCLE_STYLE = {
  circleRadius: 8,
  circleColor: ["get", "color"],
  circleStrokeWidth: 2,
  circleStrokeColor: "#ffffff",
  circleOpacity: 0.95,
  circlePitchAlignment: "map",
};

const DEVICE_LABEL_STYLE = {
  textField: ["get", "name"],
  textSize: 10,
  textOffset: [0, 1.4],
  textAnchor: "top",
  textColor: TOPOLOGY_PALETTE.textPrimary,
  textHaloColor: "#ffffff",
  textHaloWidth: 1,
  textAllowOverlap: false,
  textOptional: true,
};

interface NativeTopologyMapProps {
  /** Null selama posisi awal kamera belum diketahui → tampilkan placeholder. */
  initialCamera: CameraSettings | null;
  cameraRef: RefObject<MapCameraHandle | null>;
  connectionLines: GeoJSONFeatureCollection<ConnectionLineFeature>;
  kmzGeoJson: GeoJSONFeatureCollection;
  devicesGeoJson: GeoJSONFeatureCollection<DeviceFeature>;
  onDevicePress: (event: ShapePressEvent<DeviceFeature>) => void;
  /** Menyalakan GPS native MapLibre; matikan saat layar tidak fokus. */
  isUserLocationVisible: boolean;
}

/**
 * Peta MapLibre native: garis koneksi, garis KMZ, dan titik perangkat.
 * Di-memo agar layer tidak digambar ulang saat overlay di atasnya berubah.
 */
export const NativeTopologyMap = React.memo(function NativeTopologyMap({
  initialCamera,
  cameraRef,
  connectionLines,
  kmzGeoJson,
  devicesGeoJson,
  onDevicePress,
  isUserLocationVisible,
}: NativeTopologyMapProps) {
  const { warna } = useTemaPersona();

  const handleLinePress = useCallback((event: ShapePressEvent<ConnectionLineFeature>) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const { sourceName, targetName, distance } = feature.properties;
    Alert.alert(
      "Info Jalur Kabel",
      `Dari: ${sourceName}\nKe: ${targetName}\nJarak Estimasi: ${distance || "?"}`,
      [{ text: "Tutup" }],
    );
  }, []);

  if (!initialCamera) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="large" color={warna.utamaTerang} />
        <Text style={styles.placeholderText}>Memuat peta perangkat...</Text>
      </View>
    );
  }

  return (
    <MapLibreGL.MapView
      style={styles.map}
      mapStyle={SATELLITE_MAP_STYLE}
      logoEnabled={false}
      attributionEnabled={false}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        followUserLocation={false}
        minZoomLevel={MIN_MAP_ZOOM}
        maxZoomLevel={MAX_MAP_ZOOM}
        defaultSettings={initialCamera}
      />

      {isUserLocationVisible ? (
        <MapLibreGL.UserLocation visible={true} animated={false} showsUserHeadingIndicator={false} />
      ) : null}

      <MapLibreGL.ShapeSource id="linesSource" shape={connectionLines} onPress={handleLinePress}>
        <MapLibreGL.LineLayer id="linesLayer" style={CONNECTION_LINE_STYLE} />
      </MapLibreGL.ShapeSource>

      <MapLibreGL.ShapeSource id="kmzSource" shape={kmzGeoJson}>
        <MapLibreGL.LineLayer id="kmzLineLayer" style={KMZ_LINE_STYLE} />
      </MapLibreGL.ShapeSource>

      <MapLibreGL.ShapeSource
        id="devicesSource"
        shape={devicesGeoJson}
        onPress={onDevicePress}
        hitbox={DEVICE_HITBOX}
      >
        <MapLibreGL.CircleLayer id="devicesCircleLayer" style={DEVICE_CIRCLE_STYLE} />
        <MapLibreGL.SymbolLayer
          id="devicesLabelLayer"
          minZoomLevel={DEVICE_LABEL_MIN_ZOOM}
          style={DEVICE_LABEL_STYLE}
        />
      </MapLibreGL.ShapeSource>
    </MapLibreGL.MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: TOPOLOGY_PALETTE.surfaceMuted,
    gap: 12,
  },
  placeholderText: {
    color: TOPOLOGY_PALETTE.textSecondary,
    fontSize: 14,
  },
});
