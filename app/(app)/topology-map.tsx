import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopologySkeleton } from "@/components/molecules/TopologySkeleton";
import { DeviceDetailModal } from "@/components/organisms/topology/DeviceDetailModal";
import { DeviceListModal } from "@/components/organisms/topology/DeviceListModal";
import { NativeTopologyMap, isNativeMapAvailable } from "@/components/organisms/topology/NativeTopologyMap";
import { TopologyErrorBoundary } from "@/components/organisms/topology/TopologyErrorBoundary";
import { TopologyErrorState } from "@/components/organisms/topology/TopologyErrorState";
import { TopologyHeader } from "@/components/organisms/topology/TopologyHeader";
import { KmzLoadingBadge, LocateUserButton } from "@/components/organisms/topology/TopologyMapOverlays";
import { TopologyMapUnavailable } from "@/components/organisms/topology/TopologyMapUnavailable";
import { TopologySearchOverlay } from "@/components/organisms/topology/TopologySearchOverlay";
import { TOPOLOGY_PALETTE } from "@/components/organisms/topology/topologyPalette";
import type { TopologyDevice } from "@/components/organisms/topology/topologyTypes";
import { WebMapView } from "@/components/organisms/topology/WebMapView";
import { AppFeature } from "@/constants/features";
import { ALL_LAYERS_VISIBLE, useTopologyMap } from "@/hooks/topology/useTopologyMap";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import { useUserLocationWatcher } from "@/hooks/useUserLocationWatcher";
import { isWeb } from "@/utils/maplibre";

/** Layar peta topologi jaringan (read-only): native MapLibre, web, atau fallback Expo Go. */
export default function TopologyMapScreen() {
  const isDiizinkan = useFeatureGuard(AppFeature.TOPOLOGY);

  const router = useRouter();
  const isFocused = useIsFocused();
  const userLocation = useUserLocationWatcher();
  const topology = useTopologyMap(userLocation, isDiizinkan);
  const { camera, selectedDevice, focusDevice, refetch } = topology;
  const [isDeviceListOpen, setIsDeviceListOpen] = useState(false);

  const goBack = useCallback(() => router.back(), [router]);
  const openDeviceList = useCallback(() => setIsDeviceListOpen(true), []);
  const closeDeviceList = useCallback(() => setIsDeviceListOpen(false), []);
  const retry = useCallback(() => refetch(), [refetch]);

  const handleDeviceListSelect = useCallback(
    (device: TopologyDevice) => {
      setIsDeviceListOpen(false);
      focusDevice(device);
    },
    [focusDevice],
  );

  const deviceDetailModal = (
    <DeviceDetailModal
      visible={selectedDevice !== null}
      onClose={topology.clearSelectedDevice}
      device={selectedDevice?.data || null}
      deviceType={selectedDevice?.type || null}
    />
  );

  // Expo Go (native) tidak punya MapLibre → tampilkan pesan pengganti peta.
  if (!isWeb && !isNativeMapAvailable) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopologyHeader onBack={goBack} />
        <TopologyMapUnavailable onBack={goBack} />
      </SafeAreaView>
    );
  }

  if (topology.isLoading && !topology.data) return <TopologySkeleton />;
  if (topology.errorMessage) {
    return <TopologyErrorState message={topology.errorMessage} onRetry={retry} />;
  }

  const header = (
    <TopologyHeader onBack={goBack} onOpenDeviceList={openDeviceList} isDeviceListOpen={isDeviceListOpen} />
  );

  if (isWeb) {
    return (
      <TopologyErrorBoundary>
        <SafeAreaView style={styles.container} edges={["top"]}>
          {header}
          <View style={styles.mapContainer}>
            <WebMapView
              devices={topology.webDevices}
              lines={topology.webLines}
              visibility={ALL_LAYERS_VISIBLE}
              onDevicePress={topology.handleWebDevicePress}
              onRefresh={retry}
              loading={topology.isLoading}
            />
          </View>
          {deviceDetailModal}
        </SafeAreaView>
      </TopologyErrorBoundary>
    );
  }

  return (
    <TopologyErrorBoundary>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {header}
        <View style={styles.mapContainer}>
          <NativeTopologyMap
            initialCamera={camera.initialCamera}
            cameraRef={camera.cameraRef}
            connectionLines={topology.connectionLines}
            kmzGeoJson={topology.kmzGeoJson}
            devicesGeoJson={topology.devicesGeoJson}
            onDevicePress={topology.handleDeviceShapePress}
            isUserLocationVisible={isFocused && userLocation !== null}
          />
          <TopologySearchOverlay
            devices={topology.allDevices}
            onSelectDevice={topology.handleSearchResultSelect}
          />
          {topology.isLoadingKmz && <KmzLoadingBadge />}
          <LocateUserButton isEnabled={userLocation !== null} onPress={camera.centerOnUser} />
        </View>
        {deviceDetailModal}
        <DeviceListModal
          visible={isDeviceListOpen}
          devices={topology.allDevices}
          onClose={closeDeviceList}
          onSelectDevice={handleDeviceListSelect}
        />
      </SafeAreaView>
    </TopologyErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOPOLOGY_PALETTE.surface,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
});
