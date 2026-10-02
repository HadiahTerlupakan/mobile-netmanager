/**
 * Penyusunan DeviceData untuk modal detail perangkat topology, baik dari
 * record perangkat langsung maupun dari titik yang ditekan di peta.
 */
import type {
  DeviceData,
  DeviceFeature,
  DeviceFeatureProperties,
  DeviceType,
  TopologyData,
  TopologyDeviceRecord,
  TopologyNode,
} from "@/components/organisms/topology/topologyTypes";
import { getInventoryDevices } from "@/utils/topology/topologyDevices";

/** Tipe fallback bila titik peta tidak membawa tipe. */
const FALLBACK_FEATURE_TYPE: DeviceType = "pole";
/** Nama fallback bila titik peta tidak bernama. */
const FALLBACK_DEVICE_NAME = "Perangkat";

/** Field teknis yang sama-sama dimiliki MappingNode dan properti titik peta. */
type NodeLikeDetails = Pick<
  TopologyNode,
  "capacity" | "splitter" | "serialNumber" | "pppoe" | "usedSlots" | "inputCoreColor" | "photo"
> & {
  notes?: string | null;
  description?: string | null;
  attenuationIn?: string | number;
  attenuationOut?: string | number;
  parent?: DeviceData["parent"];
};

/** Petakan field gaya MappingNode (attenuationIn/Out, photo) ke DeviceData. */
function mapNodeLikeDetails(source: NodeLikeDetails): Omit<DeviceData, "id" | "latitude" | "longitude"> {
  return {
    notes: source.notes || source.description,
    capacity: source.capacity,
    splitter: source.splitter,
    serialNumber: source.serialNumber,
    pppoe: source.pppoe,
    attenuationInput: source.attenuationIn,
    attenuationOutput: source.attenuationOut,
    usedSlots: source.usedSlots,
    inputCoreColor: source.inputCoreColor,
    images: source.photo ? [source.photo] : undefined,
    parent: source.parent,
  };
}

/** Ratakan field khusus ODP (site, jumlah output) agar terbaca modal detail. */
export function enrichDeviceForDetail(
  device: DeviceData & Pick<TopologyDeviceRecord, "site" | "_count">,
  type: DeviceType,
): DeviceData {
  const enrichedDevice: DeviceData = { ...device };
  if (type !== "odp") return enrichedDevice;
  if (device.site?.name) enrichedDevice.siteName = device.site.name;
  if (device._count?.odpOutput !== undefined) {
    enrichedDevice.odpOutputCount = device._count.odpOutput;
  }
  return enrichedDevice;
}

/** ID asli perangkat yang direpresentasikan titik peta. */
function getFeatureTargetId(properties: DeviceFeatureProperties): string {
  return properties.originalId !== undefined && properties.originalId !== null
    ? String(properties.originalId)
    : String(properties.id ?? "");
}

/** Cari record perangkat di data topologi: inventaris sesuai tipe, lalu MappingNode. */
function findDeviceRecord(
  data: TopologyData,
  type: DeviceType,
  targetId: string,
  featureId: string,
): DeviceData | null {
  if (type !== "kmz") {
    const inventoryDevice = getInventoryDevices(data, type).find(
      (device) => String(device.id) === targetId || String(device.nodeId) === targetId,
    );
    if (inventoryDevice) return inventoryDevice;
  }

  const node = data.nodes?.find(
    (candidate) => String(candidate.nodeId) === targetId || String(candidate.nodeId) === featureId,
  );
  if (!node) return null;
  return {
    id: String(node.nodeId),
    name: node.name,
    latitude: node.latitude,
    longitude: node.longitude,
    ...mapNodeLikeDetails(node),
  };
}

/** Lengkapi field kosong record dengan nilai dari properti titik peta. */
function mergeFeatureProperties(device: DeviceData, properties: DeviceFeatureProperties): DeviceData {
  return {
    ...device,
    capacity: device.capacity ?? properties.capacity,
    splitter: device.splitter ?? properties.splitter,
    serialNumber: device.serialNumber ?? properties.serialNumber,
    pppoe: device.pppoe ?? properties.pppoe,
    attenuationInput: device.attenuationInput ?? properties.attenuationIn,
    attenuationOutput: device.attenuationOutput ?? properties.attenuationOut,
    usedSlots: device.usedSlots ?? properties.usedSlots,
    inputCoreColor: device.inputCoreColor ?? properties.inputCoreColor,
    parent: device.parent ?? properties.parent,
    notes: device.notes ?? properties.notes,
    photo: device.photo ?? properties.photo,
  };
}

/** DeviceData minimal dari properti titik peta saat record tidak ditemukan. */
function buildDeviceFromFeature(feature: DeviceFeature, targetId: string): DeviceData {
  const properties = feature.properties;
  const coordinates = feature.geometry?.coordinates || [0, 0];
  return {
    id: targetId || String(properties.id || "unknown"),
    name: properties.name || FALLBACK_DEVICE_NAME,
    latitude: Number(coordinates[1]) || 0,
    longitude: Number(coordinates[0]) || 0,
    ...mapNodeLikeDetails(properties),
  };
}

/**
 * Susun data modal detail dari titik perangkat yang ditekan di peta native:
 * pakai record asli bila ada (dilengkapi properti titik), selain itu
 * bangun dari properti titik.
 */
export function resolveDeviceFromFeature(
  data: TopologyData | null | undefined,
  feature: DeviceFeature,
): { device: DeviceData; type: DeviceType } {
  const properties = feature.properties || ({} as DeviceFeatureProperties);
  const type = properties.type || FALLBACK_FEATURE_TYPE;
  const targetId = getFeatureTargetId(properties);

  const record =
    data && targetId ? findDeviceRecord(data, type, targetId, String(properties.id)) : null;
  const device = record
    ? mergeFeatureProperties(record, properties)
    : buildDeviceFromFeature({ ...feature, properties }, targetId);

  return { device, type };
}
