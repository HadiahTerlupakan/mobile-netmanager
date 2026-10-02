import { ArrowLeft, List } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTemaPersona } from "@/theme";

import { TOPOLOGY_PALETTE } from "./topologyPalette";

const HEADER_ICON_SIZE = 24;
/** Lebar pengganti tombol kanan agar judul tetap di tengah. */
const HEADER_SIDE_PLACEHOLDER_WIDTH = 40;

interface TopologyHeaderProps {
  onBack: () => void;
  /** Bila diisi, tampilkan tombol daftar perangkat di kanan. */
  onOpenDeviceList?: () => void;
  isDeviceListOpen?: boolean;
}

/** Header layar topology: tombol kembali, judul, dan tombol daftar perangkat opsional. */
export function TopologyHeader({ onBack, onOpenDeviceList, isDeviceListOpen = false }: TopologyHeaderProps) {
  const { warna } = useTemaPersona();

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={onBack}>
        <ArrowLeft size={HEADER_ICON_SIZE} color={TOPOLOGY_PALETTE.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Topology Map</Text>
      {onOpenDeviceList ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenDeviceList}
          accessibilityRole="button"
          accessibilityLabel="Daftar perangkat"
        >
          <List
            size={HEADER_ICON_SIZE}
            color={isDeviceListOpen ? warna.utamaTerang : TOPOLOGY_PALETTE.textSecondary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.sidePlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: TOPOLOGY_PALETTE.surface,
    borderBottomWidth: 1,
    borderBottomColor: TOPOLOGY_PALETTE.border,
    zIndex: 20,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TOPOLOGY_PALETTE.textPrimary,
  },
  sidePlaceholder: {
    width: HEADER_SIDE_PLACEHOLDER_WIDTH,
  },
});
