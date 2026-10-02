import { describe, expect, it } from '@jest/globals';

import { enrichDeviceForDetail, resolveDeviceFromFeature } from '@/utils/topology/deviceDetail';
import type { DeviceFeature, DeviceFeatureProperties } from '@/components/organisms/topology/topologyTypes';

import { createTopologyData, odp, serverNode } from '../../fixtures/topology/topologyData';

const makeFeature = (properties: Partial<DeviceFeatureProperties>): DeviceFeature => ({
  type: 'Feature',
  properties: {
    id: 'x',
    type: 'odp',
    color: '#000',
    name: 'Titik',
    source: 'inventory',
    ...properties,
  },
  geometry: { type: 'Point', coordinates: [106.9, -6.3] },
});

describe('enrichDeviceForDetail', () => {
  it('meratakan site & jumlah output untuk ODP', () => {
    expect(enrichDeviceForDetail(odp, 'odp')).toMatchObject({ siteName: 'Site A', odpOutputCount: 4 });
  });

  it('tidak menambah field ODP untuk tipe lain', () => {
    const enriched = enrichDeviceForDetail(odp, 'odc');
    expect(enriched.siteName).toBeUndefined();
    expect(enriched.odpOutputCount).toBeUndefined();
  });
});

describe('resolveDeviceFromFeature', () => {
  it('memakai record inventaris asli lalu melengkapinya dari properti titik', () => {
    const { device, type } = resolveDeviceFromFeature(
      createTopologyData({ odps: [odp] }),
      makeFeature({ id: 'odp-1', originalId: 'odp-1', capacity: 16 }),
    );

    expect(type).toBe('odp');
    expect(device).toMatchObject({ id: 'odp-1', name: 'ODP Satu', notes: 'catatan odp', capacity: 16 });
  });

  it('memetakan MappingNode bila record inventaris tidak ada', () => {
    const { device } = resolveDeviceFromFeature(
      createTopologyData({ nodes: [serverNode] }),
      makeFeature({ id: 'node-1', originalId: 'node-1', type: 'otb', source: 'mapping-node' }),
    );

    expect(device).toMatchObject({
      id: 'node-1',
      name: 'Server Pusat',
      notes: 'node server',
      attenuationInput: -3,
      images: ['https://example.com/foto.jpg'],
    });
  });

  it('membangun data dari properti titik bila record tidak ditemukan', () => {
    const { device, type } = resolveDeviceFromFeature(
      createTopologyData(),
      makeFeature({ id: 'hilang', originalId: undefined, name: '', description: 'deskripsi', type: 'pole' }),
    );

    expect(type).toBe('pole');
    expect(device).toMatchObject({
      id: 'hilang',
      name: 'Perangkat',
      latitude: -6.3,
      longitude: 106.9,
      notes: 'deskripsi',
    });
  });
});
