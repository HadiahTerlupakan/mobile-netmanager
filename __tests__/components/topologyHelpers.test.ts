import { describe, expect, it, jest } from '@jest/globals';

jest.mock('lucide-react-native', () => ({
  Box: 'Box',
  Disc: 'Disc',
  Flag: 'Flag',
  Home: 'Home',
  MapPin: 'MapPin',
  Server: 'Server',
  Square: 'Square',
}));

import {
  buildConnectionLines,
  buildDevicesGeoJson,
  buildWebDevices,
  getLineColor,
  LINE_COLORS,
  MARKER_COLORS,
} from '@/components/organisms/topology/topologyHelpers';
import type { VisibilityState } from '@/components/organisms/topology/topologyTypes';
import { DEFAULT_LINE_COLOR } from '@/utils/topology/topologyGeo';

import { createTopologyData, odc, odp, pelanggan, serverNode } from '../fixtures/topology/topologyData';

const ALL_VISIBLE: VisibilityState = {
  otb: true,
  odc: true,
  odp: true,
  pole: true,
  joinbox: true,
  pelanggan: true,
  kmz: true,
  lines: true,
};

describe('getLineColor', () => {
  it('membedakan segmen feeder, distribusi, dan drop (dua arah)', () => {
    expect(getLineColor('SERVER', 'odc')).toBe(LINE_COLORS.feeder);
    expect(getLineColor('odc', 'olt')).toBe(LINE_COLORS.feeder);
    expect(getLineColor('odp', 'odc')).toBe(LINE_COLORS.distribution);
    expect(getLineColor('ont', 'odp')).toBe(LINE_COLORS.drop);
  });

  it('memakai warna edge lalu warna default untuk pasangan lain', () => {
    expect(getLineColor('pole', 'joinbox', '#abcdef')).toBe('#abcdef');
    expect(getLineColor('pole', 'joinbox')).toBe(DEFAULT_LINE_COLOR);
  });
});

describe('buildDevicesGeoJson', () => {
  it('membuat titik inventaris & node berwarna sesuai tipe, melewati yang tanpa koordinat', () => {
    const collection = buildDevicesGeoJson(
      createTopologyData({
        odcs: [odc, { ...odc, id: 'odc-0', latitude: 0 }],
        nodes: [serverNode],
      }),
      ALL_VISIBLE,
    );

    expect(collection.features.map((feature) => feature.id)).toEqual(['odc-odc-1', 'node-node-1']);
    expect(collection.features[1].properties).toMatchObject({
      type: 'otb',
      color: MARKER_COLORS.otb,
      source: 'mapping-node',
      originalType: 'SERVER',
    });
  });

  it('menghormati visibilitas per tipe', () => {
    const collection = buildDevicesGeoJson(createTopologyData({ odcs: [odc], odps: [odp] }), {
      ...ALL_VISIBLE,
      odc: false,
    });
    expect(collection.features.map((feature) => feature.properties.type)).toEqual(['odp']);
  });
});

describe('buildConnectionLines', () => {
  const edge = { id: 'e1', source: 'odc-1', target: 'odp-1', sourceType: 'odc', targetType: 'odp', color: '' };

  it('menghubungkan titik terlihat dengan warna segmen dan jarak', () => {
    const data = createTopologyData({ odcs: [odc], odps: [odp], edges: [edge] });
    const devices = buildDevicesGeoJson(data, ALL_VISIBLE);
    const [line] = buildConnectionLines(data, devices.features, true).features;

    expect(line.properties).toMatchObject({
      edgeId: 'e1',
      color: LINE_COLORS.distribution,
      sourceName: 'ODC Utama',
      targetName: 'ODP Satu',
    });
    expect(line.properties.distance).toMatch(/^\d+m$/);
    expect(line.geometry.coordinates).toEqual([
      [106.8, -6.2],
      [106.81, -6.21],
    ]);
  });

  it('kosong bila garis disembunyikan', () => {
    const data = createTopologyData({ odcs: [odc], odps: [odp], edges: [edge] });
    const devices = buildDevicesGeoJson(data, ALL_VISIBLE);
    expect(buildConnectionLines(data, devices.features, false).features).toEqual([]);
  });
});

describe('buildWebDevices', () => {
  it('menyusun marker web dengan nama fallback dan id node', () => {
    const devices = buildWebDevices(createTopologyData({ pelanggans: [pelanggan], nodes: [serverNode] }));

    expect(devices.map(({ id, type, name, color }) => ({ id, type, name, color }))).toEqual([
      { id: 'plg-1', type: 'pelanggan', name: 'Budi', color: MARKER_COLORS.pelanggan },
      { id: 'node-1', type: 'otb', name: 'Server Pusat', color: MARKER_COLORS.otb },
    ]);
  });
});
