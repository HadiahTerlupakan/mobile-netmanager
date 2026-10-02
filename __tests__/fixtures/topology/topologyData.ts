import type { TopologyData } from '@/components/organisms/topology/topologyTypes';

/** Data topologi kosong; override koleksi yang dibutuhkan tes. */
export function createTopologyData(overrides: Partial<TopologyData> = {}): TopologyData {
  return {
    otbs: [],
    odcs: [],
    odps: [],
    joinboxes: [],
    poles: [],
    pelanggans: [],
    nodes: [],
    kmzFiles: [],
    edges: [],
    ...overrides,
  };
}

export const odc = {
  id: 'odc-1',
  name: 'ODC Utama',
  location: null,
  latitude: -6.2,
  longitude: 106.8,
  notes: null,
  images: [],
};

export const odp = {
  id: 'odp-1',
  name: 'ODP Satu',
  location: null,
  latitude: -6.21,
  longitude: 106.81,
  notes: 'catatan odp',
  images: [],
  site: { name: 'Site A' },
  _count: { odpOutput: 4 },
};

export const pelanggan = {
  id: 'plg-1',
  idPelanggan: 'PLG-001',
  nama: 'Budi',
  latitude: -6.22,
  longitude: 106.82,
  alamat: null,
  status: 'aktif',
  odpId: 'odp-1',
};

export const serverNode = {
  nodeId: 'node-1',
  name: 'Server Pusat',
  type: 'SERVER',
  latitude: -6.19,
  longitude: 106.79,
  description: 'node server',
  attenuationIn: -3,
  photo: 'https://example.com/foto.jpg',
};
