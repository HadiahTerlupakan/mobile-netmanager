/**
 * Tipe domain untuk layar topology.
 * Dipisah agar screen, hook, util, dan komponen topology berbagi tipe tanpa
 * circular import.
 */

/** Jenis perangkat yang bisa tampil di peta topology. */
export type DeviceType =
  | "otb"
  | "odc"
  | "odp"
  | "joinbox"
  | "pole"
  | "pelanggan"
  | "kmz";

/** Data perangkat yang ditampilkan di DeviceDetailModal. */
export interface DeviceData {
  id: string;
  name?: string;
  nama?: string;
  idPelanggan?: string;
  location?: string | null;
  alamat?: string | null;
  latitude: number;
  longitude: number;
  notes?: string | null;
  status?: string;
  cableSlack?: boolean;
  images?: string[];
  siteName?: string;
  odpOutputCount?: number;
  splitter?: string;
  capacity?: number;
  usedSlots?: number;
  pppoe?: string;
  serialNumber?: string;
  attenuationInput?: string | number;
  attenuationOutput?: string | number;
  inputCoreColor?: string;
  photo?: string;
  parent?: {
    id: string;
    name?: string;
    type?: string;
  };
  // Specific device fields
  otbCore?: {
    otb?: { name: string };
    tubeColor: string;
    coreColor: string;
  };
  odcOutput?: {
    odc?: { name: string };
    tubeColor: string;
    coreColor: string;
  };
  odp?: {
    name: string;
  };
}

export interface TopologyData {
  otbs: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    inputCoreColor?: string;
  }[];
  odcs: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    attenuationInput?: string;
    attenuationOutput?: string;
    inputCoreColor?: string;
    capacity?: number;
    splitter?: string;
    usedSlots?: number;
    parent?: {
      id: string;
      name: string;
      type: string;
    };
    otbCore?: {
      coreColor: string;
      tubeColor: string;
      otb: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
      };
    };
  }[];
  odps: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    attenuationInput?: string;
    attenuationOutput?: string;
    inputCoreColor?: string;
    capacity?: number;
    splitter?: string;
    usedSlots?: number;
    parent?: {
      id: string;
      name: string;
      type: string;
    };
    odcOutput?: {
      coreColor: string;
      tubeColor: string;
      odc: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
      };
    };
    site?: { name: string };
    _count?: { odpOutput: number };
  }[];
  joinboxes: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    photo?: string;
    inputCoreColor?: string;
    capacity?: number;
    splitter?: string;
    usedSlots?: number;
    parent?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  poles: {
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    images: string[];
    cableSlack: boolean;
    photo?: string;
    inputCoreColor?: string;
    capacity?: number;
    splitter?: string;
    usedSlots?: number;
    parent?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  pelanggans: {
    id: string;
    idPelanggan: string;
    nama: string;
    latitude: number;
    longitude: number;
    alamat: string | null;
    status: string;
    odpId: string;
    odp?: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    };
  }[];
  nodes?: {
    nodeId: string;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    photo?: string;
    description: string | null;
    capacity?: number;
    splitter?: string;
    pppoe?: string;
    serialNumber?: string;
    notes?: string | null;
    attenuationIn?: number;
    attenuationOut?: number;
    inputCoreColor?: string;
    usedSlots?: number;
    parent?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  kmzFiles?: {
    id: string;
    name: string;
    kmlPath: string;
    lineColor: string;
    isActive: boolean;
  }[];
  edges?: {
    id: string;
    source: string;
    target: string;
    sourceType: string;
    targetType: string;
    color: string;
    waypoints?: [number, number][];
  }[];
}

/**
 * State visibilitas layer peta (per tipe perangkat + garis + kmz).
 * Sengaja `type` (bukan interface) agar dapat index signature implisit
 * sehingga tetap assignable ke Record<string, boolean> di props WebMapView.
 */
export type VisibilityState = {
  otb: boolean;
  odc: boolean;
  odp: boolean;
  pole: boolean;
  joinbox: boolean;
  pelanggan: boolean;
  kmz: boolean;
  lines: boolean;
};

/** Elemen tiap koleksi data topologi. */
export type TopologyNode = NonNullable<TopologyData["nodes"]>[number];
export type TopologyKmzFile = NonNullable<TopologyData["kmzFiles"]>[number];
export type TopologyEdge = NonNullable<TopologyData["edges"]>[number];

/** Jenis perangkat inventaris (punya koleksi sendiri di TopologyData). */
export type InventoryDeviceType = Exclude<DeviceType, "kmz">;

/**
 * Bentuk longgar satu record perangkat (inventaris maupun MappingNode).
 * Sengaja `type` agar assignable ke Record<string, any> (props WebMapView).
 */
export type TopologyDeviceRecord = {
  id?: string;
  nodeId?: string;
  name?: string;
  nama?: string;
  idPelanggan?: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
  description?: string | null;
  images?: string[];
  photo?: string;
  capacity?: number;
  splitter?: string;
  serialNumber?: string;
  pppoe?: string;
  attenuationInput?: string | number;
  attenuationOutput?: string | number;
  attenuationIn?: number;
  attenuationOut?: number;
  usedSlots?: number;
  inputCoreColor?: string;
  parent?: { id: string; name?: string; type?: string };
  site?: { name: string };
  _count?: { odpOutput: number };
};

/** Perangkat yang bisa dicari/dipilih: record + tipe hasil normalisasi. */
export type TopologyDevice = TopologyDeviceRecord & {
  id: string;
  type: DeviceType;
  originalType?: string;
};

/** Perangkat terpilih yang sedang ditampilkan di modal detail. */
export interface SelectedDevice {
  data: DeviceData;
  type: DeviceType;
}

/** Penanda perangkat untuk WebMapView. */
export interface WebTopologyDevice {
  type: DeviceType;
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  color: string;
  properties: TopologyDeviceRecord;
}

/** Garis koneksi untuk WebMapView. */
export interface WebTopologyLine {
  id: string;
  coordinates: [number, number][];
  color: string;
  sourceName: string;
  targetName: string;
}

/** Koordinat [longitude, latitude] (urutan GeoJSON/MapLibre). */
export type LngLat = [number, number];

/** Pusat dan batas sebaran perangkat di peta. */
export interface MapBounds {
  center: LngLat;
  bounds: { ne: LngLat; sw: LngLat };
}

/** Posisi kamera peta (pusat + zoom). */
export interface CameraSettings {
  centerCoordinate: LngLat;
  zoomLevel: number;
}

/** Subset API imperatif Camera MapLibre yang dipakai layar topology. */
export interface MapCameraHandle {
  setCamera: (config: CameraSettings & { animationDuration: number }) => void;
}

/** Geometri GeoJSON yang dipakai layar topology (Point/LineString/Polygon). */
export type GeoJSONGeometry = {
  type: string;
  coordinates: number[] | number[][] | number[][][];
};

/** Fitur GeoJSON dengan properti & geometri yang bisa dipersempit. */
export type GeoJSONFeature<
  Properties = Record<string, unknown>,
  Geometry = GeoJSONGeometry,
> = {
  type: "Feature";
  id?: string | number;
  properties: Properties;
  geometry: Geometry;
};

/** Koleksi fitur GeoJSON. */
export type GeoJSONFeatureCollection<Feature = GeoJSONFeature> = {
  type: "FeatureCollection";
  features: Feature[];
};

/** Properti titik perangkat di ShapeSource peta native. */
export type DeviceFeatureProperties = {
  id: string;
  originalId?: string;
  type: DeviceType;
  color: string;
  name: string;
  source: "inventory" | "mapping-node";
  originalType?: string;
  notes?: string | null;
  description?: string | null;
  capacity?: number;
  splitter?: string;
  serialNumber?: string;
  pppoe?: string;
  attenuationIn?: string | number;
  attenuationOut?: string | number;
  usedSlots?: number;
  inputCoreColor?: string;
  photo?: string;
  parent?: { id: string; name?: string; type?: string };
};

/** Titik perangkat di peta native. */
export type DeviceFeature = GeoJSONFeature<
  DeviceFeatureProperties,
  { type: "Point"; coordinates: number[] }
>;

/** Properti garis koneksi antar-perangkat. */
export type ConnectionLineProperties = {
  edgeId: string;
  color: string;
  sourceName: string;
  targetName: string;
  distance: string;
};

/** Garis koneksi antar-perangkat di peta native. */
export type ConnectionLineFeature = GeoJSONFeature<
  ConnectionLineProperties,
  { type: "LineString"; coordinates: number[][] }
>;

/** Event onPress ShapeSource MapLibre (hanya bagian yang dipakai). */
export type ShapePressEvent<Feature> = { features?: Feature[] };
