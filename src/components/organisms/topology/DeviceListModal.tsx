import { MapPin, Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { filterDeviceListItems, getDeviceDisplayName } from "@/utils/topology/topologyDevices";

import { getDeviceIcon, MARKER_COLORS } from "./topologyHelpers";
import { TOPOLOGY_PALETTE } from "./topologyPalette";
import type { TopologyDevice } from "./topologyTypes";

const CLOSE_ICON_SIZE = 24;
const ROW_ICON_SIZE = 18;
const DEVICE_ICON_SIZE = 16;
const COORDINATE_DECIMALS = 5;
const PRESSED_ROW_OPACITY = 0.7;
/** Garis pemisah dimulai sejajar teks (lebar ikon 32 + padding 16 + jarak 12). */
const SEPARATOR_INSET = 60;

interface DeviceListModalProps {
  visible: boolean;
  devices: TopologyDevice[];
  onClose: () => void;
  onSelectDevice: (device: TopologyDevice) => void;
}

/** Ringkasan tipe & koordinat perangkat untuk baris daftar. */
function formatDeviceMeta(device: TopologyDevice): string {
  const latitude = Number(device.latitude).toFixed(COORDINATE_DECIMALS);
  const longitude = Number(device.longitude).toFixed(COORDINATE_DECIMALS);
  return `${String(device.type || "").toUpperCase()} · ${latitude}, ${longitude}`;
}

function DeviceListSeparator() {
  return <View style={styles.separator} />;
}

/** Modal daftar perangkat berkoordinat dengan pencarian nama/tipe. */
export function DeviceListModal({ visible, devices, onClose, onSelectDevice }: DeviceListModalProps) {
  const [listQuery, setListQuery] = useState("");
  const listItems = useMemo(() => filterDeviceListItems(devices, listQuery), [devices, listQuery]);

  const handleItemPress = useCallback(
    (device: TopologyDevice) => {
      setListQuery("");
      Keyboard.dismiss();
      onSelectDevice(device);
    },
    [onSelectDevice],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Daftar Perangkat</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Tutup"
          >
            <X size={CLOSE_ICON_SIZE} color={TOPOLOGY_PALETTE.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Search size={ROW_ICON_SIZE} color={TOPOLOGY_PALETTE.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama / tipe perangkat..."
            value={listQuery}
            onChangeText={setListQuery}
            placeholderTextColor={TOPOLOGY_PALETTE.textPlaceholder}
          />
          {listQuery.length > 0 && (
            <TouchableOpacity onPress={() => setListQuery("")}>
              <X size={ROW_ICON_SIZE} color={TOPOLOGY_PALETTE.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={listItems}
          keyExtractor={(device, index) => `${device.type}-${device.id || index}`}
          renderItem={({ item: device }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => handleItemPress(device)}
              activeOpacity={PRESSED_ROW_OPACITY}
            >
              <View
                style={[
                  styles.itemIcon,
                  { backgroundColor: MARKER_COLORS[device.type] || TOPOLOGY_PALETTE.textPlaceholder },
                ]}
              >
                {getDeviceIcon(device.type, DEVICE_ICON_SIZE, "white")}
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {getDeviceDisplayName(device, "Tanpa Nama")}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {formatDeviceMeta(device)}
                </Text>
              </View>
              <MapPin size={ROW_ICON_SIZE} color={TOPOLOGY_PALETTE.textPlaceholder} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={DeviceListSeparator}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tidak ada perangkat ditemukan.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOPOLOGY_PALETTE.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOPOLOGY_PALETTE.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: TOPOLOGY_PALETTE.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: TOPOLOGY_PALETTE.surfaceMuted,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TOPOLOGY_PALETTE.textPrimary,
    paddingVertical: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: TOPOLOGY_PALETTE.textPrimary,
  },
  itemMeta: {
    fontSize: 12,
    color: TOPOLOGY_PALETTE.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: TOPOLOGY_PALETTE.divider,
    marginLeft: SEPARATOR_INSET,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: TOPOLOGY_PALETTE.textPlaceholder,
    fontSize: 14,
  },
});
