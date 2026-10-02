/**
 * Logika murni perangkat topology: normalisasi tipe MappingNode, pencarian,
 * dan filter daftar perangkat.
 */
import type {
  DeviceType,
  InventoryDeviceType,
  TopologyData,
  TopologyDevice,
  TopologyDeviceRecord,
  TopologyNode,
} from "@/components/organisms/topology/topologyTypes";

/** Panjang minimum kata kunci sebelum pencarian di peta dijalankan. */
export const MIN_SEARCH_QUERY_LENGTH = 2;
/** Batas hasil pencarian yang ditampilkan di dropdown peta. */
export const MAX_SEARCH_RESULTS = 20;
/** Batas item di modal daftar perangkat agar list tetap ringan. */
export const MAX_DEVICE_LIST_ITEMS = 200;

/** Tipe fallback bila tipe MappingNode kosong/tidak dikenal. */
const FALLBACK_DEVICE_TYPE: DeviceType = "pole";

/** Pemetaan tipe MappingNode (lowercase) → tipe perangkat peta. */
const NODE_TYPE_TO_DEVICE_TYPE: Record<string, DeviceType> = {
  server: "otb",
  odc: "odc",
  odp: "odp",
  ont: "pelanggan",
};

/** Urutan koleksi inventaris untuk daftar pencarian (dipertahankan dari implementasi lama). */
const SEARCH_INVENTORY_ORDER: InventoryDeviceType[] = [
  "otb",
  "odc",
  "odp",
  "pole",
  "joinbox",
  "pelanggan",
];

/** Petakan tipe MappingNode ke tipe perangkat peta; default "pole". */
export function mapNodeTypeToDeviceType(nodeType: string | null | undefined): DeviceType {
  if (!nodeType) return FALLBACK_DEVICE_TYPE;
  return NODE_TYPE_TO_DEVICE_TYPE[nodeType.toLowerCase()] ?? FALLBACK_DEVICE_TYPE;
}

/** Record perangkat inventaris (selalu ber-id). */
export type InventoryDeviceRecord = TopologyDeviceRecord & { id: string };

/** Ambil koleksi inventaris untuk satu tipe perangkat. */
export function getInventoryDevices(
  data: TopologyData,
  type: InventoryDeviceType,
): InventoryDeviceRecord[] {
  switch (type) {
    case "otb":
      return data.otbs;
    case "odc":
      return data.odcs;
    case "odp":
      return data.odps;
    case "joinbox":
      return data.joinboxes;
    case "pole":
      return data.poles;
    case "pelanggan":
      return data.pelanggans;
  }
}

/** Jumlah seluruh perangkat inventaris (tanpa MappingNode). */
export function countInventoryDevices(data: TopologyData): number {
  return SEARCH_INVENTORY_ORDER.reduce(
    (total, type) => total + (getInventoryDevices(data, type)?.length || 0),
    0,
  );
}

/** Nama tampilan perangkat: name → nama → idPelanggan → fallback. */
export function getDeviceDisplayName(
  device: Pick<TopologyDeviceRecord, "name" | "nama" | "idPelanggan">,
  fallback = "",
): string {
  return String(device.name || device.nama || device.idPelanggan || fallback);
}

/** Normalisasi MappingNode menjadi perangkat yang bisa dicari/dipilih. */
function toSearchableNode(node: TopologyNode): TopologyDevice {
  return {
    ...node,
    id: node.nodeId,
    type: mapNodeTypeToDeviceType(node.type),
    originalType: node.type,
    notes: node.description, // DetailModal membaca `notes`
  };
}

/** Gabungkan inventaris + MappingNode menjadi satu daftar perangkat ber-tipe. */
export function collectSearchableDevices(data: TopologyData | null | undefined): TopologyDevice[] {
  if (!data) return [];
  const devices: TopologyDevice[] = [];
  SEARCH_INVENTORY_ORDER.forEach((type) => {
    getInventoryDevices(data, type)?.forEach((device) =>
      devices.push({ ...device, type }),
    );
  });
  data.nodes?.forEach((node) => devices.push(toSearchableNode(node)));
  return devices;
}

/** Hasil pencarian dropdown peta: cocok nama, minimal 2 huruf, maksimal 20. */
export function searchDevicesByName(devices: TopologyDevice[], query: string): TopologyDevice[] {
  if (!query || query.length < MIN_SEARCH_QUERY_LENGTH) return [];
  const normalizedQuery = query.toLowerCase();
  return devices
    .filter((device) => getDeviceDisplayName(device).toLowerCase().includes(normalizedQuery))
    .slice(0, MAX_SEARCH_RESULTS);
}

/** Item modal daftar perangkat: berkoordinat, cocok nama/tipe, maksimal 200. */
export function filterDeviceListItems(devices: TopologyDevice[], query: string): TopologyDevice[] {
  const normalizedQuery = query.trim().toLowerCase();
  return devices
    .filter((device) => {
      if (!device.latitude || !device.longitude) return false;
      if (!normalizedQuery) return true;
      const name = getDeviceDisplayName(device).toLowerCase();
      const type = String(device.type || "").toLowerCase();
      return name.includes(normalizedQuery) || type.includes(normalizedQuery);
    })
    .slice(0, MAX_DEVICE_LIST_ITEMS);
}
