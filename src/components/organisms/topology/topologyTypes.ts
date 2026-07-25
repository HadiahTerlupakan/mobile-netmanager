/**
 * Tipe domain untuk layar topology.
 * Dipisah agar screen dan topologyHelpers berbagi tipe tanpa circular import.
 */

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
 * sehingga tetap assignable ke Record<string, boolean> di props FilterPanel.
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
