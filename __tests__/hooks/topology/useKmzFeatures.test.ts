import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

const mockApiGet = jest.fn();
const mockKml = jest.fn();

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    defaults: { baseURL: 'https://api.example.com' },
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

jest.mock('@/utils/togeojson-wrapper', () => ({
  __esModule: true,
  default: { kml: (...args: unknown[]) => mockKml(...args) },
}));

jest.mock('@xmldom/xmldom', () => ({
  DOMParser: jest.fn(() => ({ parseFromString: jest.fn(() => 'kml-document') })),
}));

import { useKmzFeatures } from '@/hooks/topology/useKmzFeatures';
import type { TopologyData } from '@/components/organisms/topology/topologyTypes';

import { createTopologyData } from '../../fixtures/topology/topologyData';

const kmzFile = { id: 'kmz-1', name: 'Rute Utama', kmlPath: '/uploads/rute.kml', lineColor: '#123456', isActive: true };

const lineFeature = {
  type: 'Feature',
  properties: { name: 'Jalur' },
  geometry: { type: 'LineString', coordinates: [[106.8, -6.2], [106.81, -6.21]] },
};

describe('useKmzFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiGet.mockResolvedValue({ data: '<kml/>' } as never);
    mockKml.mockReturnValue({ type: 'FeatureCollection', features: [lineFeature] });
  });

  it('tidak memuat apa pun sebelum data topologi tersedia', () => {
    const { result } = renderHook(() => useKmzFeatures(undefined));

    expect(result.current.kmzGeoJson.features).toEqual([]);
    expect(result.current.isLoadingKmz).toBe(false);
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('mengunduh KML internal lewat api lalu mewarnai fiturnya', async () => {
    const data = createTopologyData({ kmzFiles: [kmzFile] });
    const { result } = renderHook(() => useKmzFeatures(data));

    await waitFor(() => expect(result.current.kmzGeoJson.features).toHaveLength(1));

    expect(mockApiGet).toHaveBeenCalledWith('/uploads/rute.kml', { responseType: 'text' });
    expect(result.current.kmzGeoJson.features[0].properties).toMatchObject({
      color: '#123456',
      kmzId: 'kmz-1',
      sourceFile: 'Rute Utama',
    });
    expect(result.current.isLoadingKmz).toBe(false);
  });

  it('memakai cache saat data berganti tetapi berkas KML sama', async () => {
    const { result, rerender } = renderHook(({ data }: { data: TopologyData }) => useKmzFeatures(data), {
      initialProps: { data: createTopologyData({ kmzFiles: [kmzFile] }) },
    });
    await waitFor(() => expect(result.current.kmzGeoJson.features).toHaveLength(1));

    rerender({ data: createTopologyData({ kmzFiles: [kmzFile] }) });
    await waitFor(() => expect(result.current.isLoadingKmz).toBe(false));

    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(result.current.kmzGeoJson.features).toHaveLength(1);
  });

  it('melewati berkas yang gagal diunduh tanpa menggagalkan berkas lain', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('404') as never);
    const data = createTopologyData({
      kmzFiles: [kmzFile, { ...kmzFile, id: 'kmz-2', kmlPath: '/uploads/lain.kml' }],
    });
    const { result } = renderHook(() => useKmzFeatures(data));

    await waitFor(() => expect(result.current.kmzGeoJson.features).toHaveLength(1));
    expect(result.current.kmzGeoJson.features[0].properties.kmzId).toBe('kmz-2');
  });
});
