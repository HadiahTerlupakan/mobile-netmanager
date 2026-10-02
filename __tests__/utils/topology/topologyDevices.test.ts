import { describe, expect, it } from '@jest/globals';

import {
  collectSearchableDevices,
  countInventoryDevices,
  filterDeviceListItems,
  getDeviceDisplayName,
  mapNodeTypeToDeviceType,
  MAX_DEVICE_LIST_ITEMS,
  MAX_SEARCH_RESULTS,
  searchDevicesByName,
} from '@/utils/topology/topologyDevices';
import type { TopologyDevice } from '@/components/organisms/topology/topologyTypes';

import { createTopologyData, odc, odp, pelanggan, serverNode } from '../../fixtures/topology/topologyData';

const makeDevice = (index: number, overrides: Partial<TopologyDevice> = {}): TopologyDevice => ({
  id: `d-${index}`,
  name: `ODP ${index}`,
  latitude: -6.2,
  longitude: 106.8,
  type: 'odp',
  ...overrides,
});

describe('mapNodeTypeToDeviceType', () => {
  it('memetakan tipe MappingNode tanpa peduli huruf besar/kecil', () => {
    expect(mapNodeTypeToDeviceType('SERVER')).toBe('otb');
    expect(mapNodeTypeToDeviceType('odc')).toBe('odc');
    expect(mapNodeTypeToDeviceType('Odp')).toBe('odp');
    expect(mapNodeTypeToDeviceType('ont')).toBe('pelanggan');
  });

  it('jatuh ke pole untuk tipe kosong atau tak dikenal', () => {
    expect(mapNodeTypeToDeviceType(undefined)).toBe('pole');
    expect(mapNodeTypeToDeviceType('')).toBe('pole');
    expect(mapNodeTypeToDeviceType('splitter')).toBe('pole');
  });
});

describe('getDeviceDisplayName', () => {
  it('memakai name → nama → idPelanggan → fallback', () => {
    expect(getDeviceDisplayName({ name: 'A', nama: 'B' })).toBe('A');
    expect(getDeviceDisplayName({ nama: 'B', idPelanggan: 'C' })).toBe('B');
    expect(getDeviceDisplayName({ idPelanggan: 'C' })).toBe('C');
    expect(getDeviceDisplayName({}, 'Tanpa Nama')).toBe('Tanpa Nama');
    expect(getDeviceDisplayName({})).toBe('');
  });
});

describe('collectSearchableDevices', () => {
  it('mengembalikan [] bila data belum ada', () => {
    expect(collectSearchableDevices(undefined)).toEqual([]);
  });

  it('menandai tipe inventaris dan menormalisasi MappingNode', () => {
    const devices = collectSearchableDevices(
      createTopologyData({ odcs: [odc], pelanggans: [pelanggan], nodes: [serverNode] }),
    );

    expect(devices.map((device) => [device.id, device.type])).toEqual([
      ['odc-1', 'odc'],
      ['plg-1', 'pelanggan'],
      ['node-1', 'otb'],
    ]);
    expect(devices[2]).toMatchObject({ originalType: 'SERVER', notes: 'node server' });
  });
});

describe('countInventoryDevices', () => {
  it('menjumlah semua koleksi inventaris tanpa MappingNode', () => {
    const data = createTopologyData({ odcs: [odc], odps: [odp], nodes: [serverNode] });
    expect(countInventoryDevices(data)).toBe(2);
  });
});

describe('searchDevicesByName', () => {
  const devices = [makeDevice(1), makeDevice(2, { name: undefined, nama: 'Budi' })];

  it('tidak mencari sebelum kata kunci minimal 2 huruf', () => {
    expect(searchDevicesByName(devices, '')).toEqual([]);
    expect(searchDevicesByName(devices, 'b')).toEqual([]);
  });

  it('mencocokkan nama tanpa peduli huruf besar/kecil', () => {
    expect(searchDevicesByName(devices, 'BUD').map((device) => device.id)).toEqual(['d-2']);
  });

  it('membatasi jumlah hasil', () => {
    const manyDevices = Array.from({ length: MAX_SEARCH_RESULTS + 5 }, (_, index) => makeDevice(index));
    expect(searchDevicesByName(manyDevices, 'odp')).toHaveLength(MAX_SEARCH_RESULTS);
  });
});

describe('filterDeviceListItems', () => {
  it('membuang perangkat tanpa koordinat', () => {
    const devices = [makeDevice(1), makeDevice(2, { latitude: 0 })];
    expect(filterDeviceListItems(devices, '').map((device) => device.id)).toEqual(['d-1']);
  });

  it('mencocokkan nama atau tipe setelah di-trim', () => {
    const devices = [makeDevice(1, { name: 'Tiang A', type: 'pole' }), makeDevice(2)];
    expect(filterDeviceListItems(devices, '  pole ').map((device) => device.id)).toEqual(['d-1']);
    expect(filterDeviceListItems(devices, 'odp 2').map((device) => device.id)).toEqual(['d-2']);
  });

  it('membatasi jumlah item daftar', () => {
    const manyDevices = Array.from({ length: MAX_DEVICE_LIST_ITEMS + 1 }, (_, index) => makeDevice(index));
    expect(filterDeviceListItems(manyDevices, '')).toHaveLength(MAX_DEVICE_LIST_ITEMS);
  });
});
