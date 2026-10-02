import { useCallback, useMemo, useState } from "react";

import {
  buildConnectionLines,
  buildDevicesGeoJson,
  buildWebDevices,
} from "@/components/organisms/topology/topologyHelpers";
import type {
  DeviceData,
  DeviceFeature,
  DeviceType,
  LngLat,
  SelectedDevice,
  ShapePressEvent,
  TopologyDevice,
  VisibilityState,
  WebTopologyDevice,
} from "@/components/organisms/topology/topologyTypes";
import { enrichDeviceForDetail, resolveDeviceFromFeature } from "@/utils/topology/deviceDetail";
import { collectSearchableDevices } from "@/utils/topology/topologyDevices";
import { buildWebLines, computeMapBounds } from "@/utils/topology/topologyGeo";

import { useKmzFeatures } from "./useKmzFeatures";
import { DEVICE_FOCUS_ZOOM, useTopologyCamera } from "./useTopologyCamera";
import { useTopologyData } from "./useTopologyData";

/** Animasi kamera saat memilih hasil pencarian (sedikit lebih lambat dari standar). */
export const SEARCH_RESULT_ANIMATION_MS = 1000;

/**
 * Semua layer peta selalu tampil. Panel filter layer sudah diganti modal
 * daftar perangkat, jadi tidak ada lagi yang mengubah nilai ini.
 */
export const ALL_LAYERS_VISIBLE: VisibilityState = {
  otb: true,
  odc: true,
  odp: true,
  pole: true,
  joinbox: true,
  pelanggan: true,
  kmz: true,
  lines: true,
};

/**
 * State & aksi layar peta topology: data + turunan GeoJSON (native & web),
 * KMZ, kamera, dan perangkat terpilih untuk modal detail.
 */
export function useTopologyMap(userLocation: LngLat | null, isDiizinkan = true) {
  const { data, isLoading, errorMessage, refetch } = useTopologyData(isDiizinkan);
  const { kmzGeoJson, isLoadingKmz } = useKmzFeatures(data);
  const [selectedDevice, setSelectedDevice] = useState<SelectedDevice | null>(null);

  const allDevices = useMemo(() => collectSearchableDevices(data), [data]);
  const devicesGeoJson = useMemo(() => buildDevicesGeoJson(data, ALL_LAYERS_VISIBLE), [data]);
  const connectionLines = useMemo(
    () => buildConnectionLines(data, devicesGeoJson.features, ALL_LAYERS_VISIBLE.lines),
    [data, devicesGeoJson],
  );
  const mapBounds = useMemo(() => computeMapBounds(data), [data]);
  const webDevices = useMemo(() => buildWebDevices(data), [data]);
  const webLines = useMemo(() => buildWebLines(data, webDevices), [data, webDevices]);

  const camera = useTopologyCamera(userLocation, mapBounds);
  const { flyToCoordinate } = camera;

  const selectDevice = useCallback((device: DeviceData, type: DeviceType) => {
    setSelectedDevice({ data: enrichDeviceForDetail(device, type), type });
  }, []);

  const clearSelectedDevice = useCallback(() => setSelectedDevice(null), []);

  /** Terbang ke perangkat (bila berkoordinat) lalu buka detailnya. */
  const focusDevice = useCallback(
    (device: TopologyDevice, animationDuration?: number) => {
      if (device.latitude && device.longitude) {
        flyToCoordinate(
          Number(device.longitude),
          Number(device.latitude),
          DEVICE_FOCUS_ZOOM,
          animationDuration,
        );
      }
      selectDevice(device, device.type);
    },
    [flyToCoordinate, selectDevice],
  );

  const handleSearchResultSelect = useCallback(
    (device: TopologyDevice) => focusDevice(device, SEARCH_RESULT_ANIMATION_MS),
    [focusDevice],
  );

  const handleDeviceShapePress = useCallback(
    (event: ShapePressEvent<DeviceFeature>) => {
      const feature = event?.features?.[0];
      if (!feature) return;
      const coordinates = feature.geometry?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length >= 2) {
        flyToCoordinate(Number(coordinates[0]), Number(coordinates[1]), DEVICE_FOCUS_ZOOM);
      }
      const { device, type } = resolveDeviceFromFeature(data, feature);
      selectDevice(device, type);
    },
    [data, flyToCoordinate, selectDevice],
  );

  const handleWebDevicePress = useCallback((device: WebTopologyDevice) => {
    setSelectedDevice({ data: device.properties as DeviceData, type: device.type });
  }, []);

  return {
    data,
    isLoading,
    errorMessage,
    refetch,
    allDevices,
    devicesGeoJson,
    connectionLines,
    kmzGeoJson,
    isLoadingKmz,
    webDevices,
    webLines,
    camera,
    selectedDevice,
    clearSelectedDevice,
    focusDevice,
    handleSearchResultSelect,
    handleDeviceShapePress,
    handleWebDevicePress,
  };
}
