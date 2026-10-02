import { FlashList } from "@shopify/flash-list";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { getDeviceDisplayName, searchDevicesByName } from "@/utils/topology/topologyDevices";

import { MARKER_COLORS } from "./topologyHelpers";
import { TOPOLOGY_PALETTE } from "./topologyPalette";
import type { TopologyDevice } from "./topologyTypes";

const SEARCH_ICON_SIZE = 20;
const RESULTS_LIST_MAX_HEIGHT = 250;

interface TopologySearchOverlayProps {
  devices: TopologyDevice[];
  onSelectDevice: (device: TopologyDevice) => void;
}

/** Kotak cari perangkat yang melayang di atas peta beserta dropdown hasilnya. */
export function TopologySearchOverlay({ devices, onSelectDevice }: TopologySearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useMemo(
    () => searchDevicesByName(devices, searchQuery),
    [devices, searchQuery],
  );

  const handleResultPress = useCallback(
    (device: TopologyDevice) => {
      Keyboard.dismiss();
      setSearchQuery("");
      onSelectDevice(device);
    },
    [onSelectDevice],
  );

  return (
    <>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={SEARCH_ICON_SIZE} color={TOPOLOGY_PALETTE.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari perangkat (ODP, ODC, Server, Pelanggan)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={TOPOLOGY_PALETTE.textPlaceholder}
          />
          {searchQuery.length > 0 && (
            <View style={styles.clearButtonRow}>
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={SEARCH_ICON_SIZE} color={TOPOLOGY_PALETTE.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlashList
            data={searchResults}
            keyExtractor={(device) => `${device.type}-${device.id}`}
            renderItem={({ item: device }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(device)}>
                <View
                  style={[
                    styles.resultDot,
                    { backgroundColor: MARKER_COLORS[device.type] || TOPOLOGY_PALETTE.unknownDeviceDot },
                  ]}
                />
                <View>
                  <Text style={styles.resultName}>{getDeviceDisplayName(device)}</Text>
                  <Text style={styles.resultType}>{device.type.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 10,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TOPOLOGY_PALETTE.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: TOPOLOGY_PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: TOPOLOGY_PALETTE.textInput,
    height: 40,
  },
  clearButtonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Tepat di bawah kotak cari (top 16 + tinggi ±50 + jarak); z-index tertinggi
  // agar dropdown tidak tertutup layer peta maupun overlay lain.
  resultsContainer: {
    position: "absolute",
    top: 70,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: TOPOLOGY_PALETTE.surface,
    borderRadius: 8,
    shadowColor: TOPOLOGY_PALETTE.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    maxHeight: 300,
  },
  resultsList: {
    maxHeight: RESULTS_LIST_MAX_HEIGHT,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOPOLOGY_PALETTE.divider,
  },
  resultDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "500",
    color: TOPOLOGY_PALETTE.textPrimary,
  },
  resultType: {
    fontSize: 12,
    color: TOPOLOGY_PALETTE.textSecondary,
  },
});
