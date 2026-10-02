import { describe, expect, it, jest } from '@jest/globals';

const mockKml = jest.fn();

jest.mock('@/utils/togeojson-wrapper', () => ({
  __esModule: true,
  default: { kml: (...args: unknown[]) => mockKml(...args) },
}));

jest.mock('@xmldom/xmldom', () => ({
  DOMParser: jest.fn(() => ({ parseFromString: jest.fn(() => 'kml-document') })),
}));

import {
  DEFAULT_KMZ_LINE_COLOR,
  getKmzCacheKey,
  isAbsoluteKmlPath,
  parseKmlFeatures,
  resolveKmlUrl,
  styleKmzFeatures,
} from '@/utils/topology/kmz';

const lineFeature = {
  type: 'Feature' as const,
  properties: { name: 'Jalur A' },
  geometry: { type: 'LineString', coordinates: [[106.8, -6.2], [106.81, -6.21]] },
};

describe('resolveKmlUrl', () => {
  it('membiarkan URL absolut apa adanya', () => {
    expect(isAbsoluteKmlPath('https://cdn.example.com/a.kml')).toBe(true);
    expect(resolveKmlUrl('https://cdn.example.com/a.kml', 'https://api.example.com')).toBe(
      'https://cdn.example.com/a.kml',
    );
  });

  it('menggabungkan path relatif ke baseURL dengan satu garis miring', () => {
    expect(resolveKmlUrl('/uploads/a.kml', 'https://api.example.com')).toBe(
      'https://api.example.com/uploads/a.kml',
    );
    expect(resolveKmlUrl('uploads/a.kml', 'https://api.example.com')).toBe(
      'https://api.example.com/uploads/a.kml',
    );
    expect(resolveKmlUrl('uploads/a.kml', undefined)).toBe('/uploads/a.kml');
  });
});

describe('getKmzCacheKey', () => {
  it('menggabungkan id dan path KML', () => {
    expect(getKmzCacheKey({ id: 'kmz-1', kmlPath: '/a.kml' })).toBe('kmz-1-/a.kml');
  });
});

describe('styleKmzFeatures', () => {
  it('menambah warna & asal berkas tanpa membuang properti asli', () => {
    const [styled] = styleKmzFeatures([lineFeature], { id: 'kmz-1', name: 'Rute', lineColor: '#123456' });
    expect(styled.properties).toEqual({ name: 'Jalur A', color: '#123456', kmzId: 'kmz-1', sourceFile: 'Rute' });
    expect(lineFeature.properties).toEqual({ name: 'Jalur A' });
  });

  it('memakai warna default bila berkas tidak menentukan warna', () => {
    const [styled] = styleKmzFeatures([lineFeature], { id: 'kmz-1', name: 'Rute', lineColor: '' });
    expect(styled.properties.color).toBe(DEFAULT_KMZ_LINE_COLOR);
  });
});

describe('parseKmlFeatures', () => {
  it('mengembalikan fitur hasil konversi KML', () => {
    mockKml.mockReturnValueOnce({ type: 'FeatureCollection', features: [lineFeature] });
    expect(parseKmlFeatures('<kml/>')).toEqual([lineFeature]);
    expect(mockKml).toHaveBeenCalledWith('kml-document');
  });

  it('mengembalikan null bila hasil konversi tanpa fitur', () => {
    mockKml.mockReturnValueOnce({ type: 'FeatureCollection' });
    expect(parseKmlFeatures('<kml/>')).toBeNull();
  });
});
