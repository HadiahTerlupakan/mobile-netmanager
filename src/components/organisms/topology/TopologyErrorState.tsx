import { RefreshCw } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTemaPersona } from "@/theme";

import { TOPOLOGY_PALETTE } from "./topologyPalette";

const RETRY_ICON_SIZE = 20;

interface TopologyErrorStateProps {
  message: string;
  onRetry: () => void;
}

/** Tampilan gagal memuat data topologi dengan tombol coba lagi. */
export function TopologyErrorState({ message, onRetry }: TopologyErrorStateProps) {
  const { warna } = useTemaPersona();

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: warna.utamaKuat }]}
        onPress={onRetry}
      >
        <RefreshCw size={RETRY_ICON_SIZE} color={TOPOLOGY_PALETTE.textOnAccent} />
        <Text style={styles.retryButtonText}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: TOPOLOGY_PALETTE.surface,
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: TOPOLOGY_PALETTE.danger,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: TOPOLOGY_PALETTE.textOnAccent,
    fontSize: 16,
    fontWeight: "600",
  },
});
