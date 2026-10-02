import { describe, expect, it } from '@jest/globals';

import {
  buildWebLines,
  computeMapBounds,
  DEFAULT_LINE_COLOR,
  isWithinIndonesia,
  normalizeWaypoint,
  parseEdgeWaypoints,
} from '@/utils/topology/topologyGeo';
import type { WebTopologyDevice } from '@/components/organisms/topology/topologyTypes';

import { createTopologyData, odc, odp, serverNode } from '../../fixtures/topology/topologyData';

const edge = {
  id: 'edge-1',
  source: 'odc-1',
  target: 'odp-1',
  sourceType: 'odc',
  targetType: 'odp',
  color: '',
};

const webDevice = (id: string, longitude: number, latitude: number): WebTopologyDevice => ({
  type: 'odp',
  id,
  name: `Nama ${id}`,
  latitude,
  longitude,
  color: '#000',
  properties: { id, latitude, longitude },
});

describe('isWithinIndonesia', () => {
  it('menerima koordinat di dalam kotak Indonesia', () => {
    expect(isWithinIndonesia(106.8, -6.2)).toBe(true);
  });

  it('menolak koordinat di luar atau bukan angka', () => {
    expect(isWithinIndonesia(0, 0)).toBe(false);
    expect(isWithinIndonesia(150, -6)).toBe(false);
    expect(isWithinIndonesia('106', -6)).toBe(false);
  });
});

describe('computeMapBounds', () => {
  it('mengembalikan null tanpa data atau tanpa koordinat valid', () => {
    expect(computeMapBounds(undefined)).toBeNull();
    expect(computeMapBounds(createTopologyData({ odcs: [{ ...odc, latitude: 0, longitude: 0 }] }))).toBeNull();
  });

  it('menghitung pusat & batas dari inventaris dan node', () => {
    const bounds = computeMapBounds(createTopologyData({ odcs: [odc], odps: [odp], nodes: [serverNode] }));

    expect(bounds?.bounds).toEqual({ ne: [106.81, -6.19], sw: [106.79, -6.21] });
    expect(bounds?.center[0]).toBeCloseTo(106.8);
    expect(bounds?.center[1]).toBeCloseTo(-6.2);
  });
});

describe('parseEdgeWaypoints', () => {
  it('mem-parse waypoint berbentuk JSON string', () => {
    expect(parseEdgeWaypoints({ id: 'e', waypoints: '[[106.8,-6.2]]' as never })).toEqual([[106.8, -6.2]]);
  });

  it('mengembalikan [] untuk JSON rusak dan meneruskan array apa adanya', () => {
    expect(parseEdgeWaypoints({ id: 'e', waypoints: '[rusak' as never })).toEqual([]);
    expect(parseEdgeWaypoints({ id: 'e', waypoints: [[1, 2]] })).toEqual([[1, 2]]);
  });
});

describe('normalizeWaypoint', () => {
  it('mempertahankan urutan [lng, lat]', () => {
    expect(normalizeWaypoint([106.8, -6.2])).toEqual([106.8, -6.2]);
  });

  it('menukar urutan [lat, lng]', () => {
    expect(normalizeWaypoint([-6.2, 106.8])).toEqual([106.8, -6.2]);
  });

  it('menerima objek longitude/latitude maupun lng/lat', () => {
    expect(normalizeWaypoint({ longitude: 106.8, latitude: -6.2 })).toEqual([106.8, -6.2]);
    expect(normalizeWaypoint({ lng: 106.8, lat: -6.2 })).toEqual([106.8, -6.2]);
    expect(normalizeWaypoint({})).toEqual([0, 0]);
  });
});

describe('buildWebLines', () => {
  const devices = [webDevice('odc-1', 106.8, -6.2), webDevice('odp-1', 106.81, -6.21)];

  it('menyusun garis sumber → waypoint → tujuan dengan warna default', () => {
    const lines = buildWebLines(
      createTopologyData({ edges: [{ ...edge, waypoints: [[106.805, -6.205]] }] }),
      devices,
    );

    expect(lines).toEqual([
      {
        id: 'edge-1',
        coordinates: [
          [106.8, -6.2],
          [106.805, -6.205],
          [106.81, -6.21],
        ],
        color: DEFAULT_LINE_COLOR,
        sourceName: 'Nama odc-1',
        targetName: 'Nama odp-1',
      },
    ]);
  });

  it('melewati edge yang ujungnya tidak ditemukan', () => {
    const lines = buildWebLines(createTopologyData({ edges: [{ ...edge, target: 'hilang' }] }), devices);
    expect(lines).toEqual([]);
  });
});
