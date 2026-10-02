/**
 * Palet netral layar topology (teks, permukaan, garis, bayangan).
 * Warna aksen persona tetap diambil dari `useTemaPersona()`; warna jenis
 * perangkat ada di MARKER_COLORS (topologyHelpers).
 */
export const TOPOLOGY_PALETTE = {
  surface: "#fff",
  surfaceTranslucent: "rgba(255, 255, 255, 0.9)",
  surfaceMuted: "#f3f4f6",
  border: "#e5e7eb",
  divider: "#f3f4f6",
  textPrimary: "#1f2937",
  textInput: "#374151",
  textSecondary: "#6b7280",
  textPlaceholder: "#9ca3af",
  iconDisabled: "#9ca3af",
  textOnAccent: "#fff",
  danger: "#dc2626",
  warning: "#f59e0b",
  shadow: "#000",
  /** Titik warna hasil pencarian bila tipe perangkat tak dikenal. */
  unknownDeviceDot: "#ccc",
} as const;
