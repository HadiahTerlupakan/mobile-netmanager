/**
 * Topology Map Types
 */

export type DeviceType = 'otb' | 'odc' | 'odp' | 'joinbox' | 'pole' | 'pelanggan' | 'kmz';

export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  title: string;
  type: DeviceType;
  data: any; // Original device object
}

export interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  markers: MarkerData[];
}
