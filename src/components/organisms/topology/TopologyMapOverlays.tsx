import { LocateFixed } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTemaPersona } from "@/theme";

import { TOPOLOGY_PALETTE } from "./topologyPalette";

const LOCATE_ICON_SIZE = 22;
const LOCATE_BUTTON_SIZE = 44;

/** Badge kecil di atas peta selama berkas KMZ sedang dimuat. */
export function KmzLoadingBadge() {
  const { warna } = useTemaPersona();

  return (
    <View style={styles.kmzBadge}>
      <ActivityIndicator size="small" color={warna.utamaTerang} />
      <Text style={styles.kmzBadgeText}>Memuat KMZ...</Text>
    </View>
  );
}

interface LocateUserButtonProps {
  isEnabled: boolean;
  onPress: () => void;
}

/** Tombol melayang untuk memusatkan peta ke lokasi pengguna. */
export function LocateUserButton({ isEnabled, onPress }: LocateUserButtonProps) {
  const { warna } = useTemaPersona();

  return (
    <TouchableOpacity
      style={[styles.locateButton, !isEnabled && styles.locateButtonDisabled]}
      onPress={onPress}
      disabled={!isEnabled}
      accessibilityRole="button"
      accessibilityLabel="Ke lokasi saya"
    >
      <LocateFixed
        size={LOCATE_ICON_SIZE}
        color={isEnabled ? warna.utama : TOPOLOGY_PALETTE.iconDisabled}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  kmzBadge: {
    position: "absolute",
    top: 80,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TOPOLOGY_PALETTE.surfaceTranslucent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: TOPOLOGY_PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  kmzBadgeText: {
    marginLeft: 8,
    fontSize: 12,
    color: TOPOLOGY_PALETTE.textSecondary,
  },
  locateButton: {
    position: "absolute",
    right: 12,
    bottom: 100,
    width: LOCATE_BUTTON_SIZE,
    height: LOCATE_BUTTON_SIZE,
    borderRadius: LOCATE_BUTTON_SIZE / 2,
    backgroundColor: TOPOLOGY_PALETTE.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
    shadowColor: TOPOLOGY_PALETTE.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  locateButtonDisabled: {
    opacity: 0.55,
  },
});
