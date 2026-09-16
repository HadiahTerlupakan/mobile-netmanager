import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockUseApiQuery = jest.fn();
const mockUseAuth = jest.fn(() => ({ token: 'token-123' }));
const mockUseFeatureGuard = jest.fn();
const mockDeviceCreateModal = jest.fn();

type MockMapViewProps = {
  onLongPress?: unknown;
};

type MockShapeSourceProps = {
  onPress?: (event: {
    features?: Array<{
      properties?: {
        edgeId?: string;
        sourceName?: string;
        targetName?: string;
        distance?: string;
      };
    }>;
  }) => void;
};

const mockMapViewProps: MockMapViewProps[] = [];
const mockShapeSourceProps: MockShapeSourceProps[] = [];
const mockUserLocationRenders: unknown[] = [];
let mockUserLocation: [number, number] | null = null;
let mockIsScreenFocused = true;
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/hooks/queries', () => ({
  useApiQuery: (...args: any[]) => mockUseApiQuery(...args),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: (...args: any[]) => mockUseFeatureGuard(...args),
}));

// Watcher GPS punya tesnya sendiri di __tests__/hooks/useUserLocationWatcher.test.tsx;
// di sini cukup nilai lokasi yang diterima layar.
jest.mock('@/hooks/useUserLocationWatcher', () => ({
  useUserLocationWatcher: () => mockUserLocation,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsScreenFocused,
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    TOPOLOGY: 'topology',
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('@/components/molecules/TopologySkeleton', () => ({
  TopologySkeleton: () => null,
}));

jest.mock('@/components/organisms/topology/DeviceDetailModal', () => ({
  DeviceDetailModal: () => null,
}));

jest.mock('@/components/organisms/topology/DeviceCreateModal', () => ({
  DeviceCreateModal: mockDeviceCreateModal,
}));

jest.mock('@/components/organisms/topology/TopologyErrorBoundary', () => ({
  TopologyErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/organisms/topology/WebMapView', () => ({
  WebMapView: () => null,
}));


jest.mock('@/utils/maplibre', () => ({
  getMapLibre: () => ({
    MapView: ({ children, ...props }: { children?: React.ReactNode; onLongPress?: unknown }) => {
      mockMapViewProps.push(props);
      return <>{children}</>;
    },
    Camera: () => null,
    ShapeSource: ({ children, ...props }: { children?: React.ReactNode; onPress?: MockShapeSourceProps['onPress'] }) => {
      mockShapeSourceProps.push(props);
      return <>{children}</>;
    },
    LineLayer: () => null,
    CircleLayer: () => null,
    SymbolLayer: () => null,
    UserLocation: (props: unknown) => {
      mockUserLocationRenders.push(props);
      return null;
    },
    MarkerView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Logger: { setLogCallback: jest.fn() },
    setAccessToken: jest.fn(),
  }),
  isMapLibreAvailable: true,
  isWeb: false,
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    defaults: { baseURL: 'https://example.com' },
    get: (...args: any[]) => mockApiGet(...args),
    post: (...args: any[]) => mockApiPost(...args),
    delete: (...args: any[]) => mockApiDelete(...args),
  },
}));

jest.mock('@/utils/togeojson-wrapper', () => ({
  __esModule: true,
  default: { kml: jest.fn(() => ({ features: [] })) },
}));

jest.mock('@xmldom/xmldom', () => ({
  DOMParser: jest.fn(() => ({ parseFromString: jest.fn() })),
}));

jest.mock('@shopify/flash-list', () => ({ FlashList: () => null }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  ArrowLeft: 'ArrowLeft',
  Box: 'Box',
  Disc: 'Disc',
  Flag: 'Flag',
  Home: 'Home',
  Layers: 'Layers',
  List: 'List',
  LocateFixed: 'LocateFixed',
  MapPin: 'MapPin',
  RefreshCw: 'RefreshCw',
  Search: 'Search',
  Server: 'Server',
  Square: 'Square',
  X: 'X',
}));
jest.mock('twrnc', () => () => ({}));

jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

const topologyData = {
  otbs: [],
  odcs: [
    {
      id: 'odc-1',
      name: 'ODC 1',
      location: null,
      latitude: -6.2,
      longitude: 106.8,
      notes: null,
      images: [],
    },
  ],
  odps: [
    {
      id: 'odp-1',
      name: 'ODP 1',
      location: null,
      latitude: -6.21,
      longitude: 106.81,
      notes: null,
      images: [],
    },
  ],
  joinboxes: [],
  poles: [],
  pelanggans: [],
  nodes: [],
  kmzFiles: [],
  edges: [
    {
      id: 'edge-1',
      source: 'odc-1',
      target: 'odp-1',
      sourceType: 'odc',
      targetType: 'odp',
      color: '#00ffff',
    },
  ],
};

describe('topology mobile read-only boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMapViewProps.length = 0;
    mockShapeSourceProps.length = 0;
    mockUserLocation = null;
    mockIsScreenFocused = true;
    mockUseApiQuery.mockReturnValue({
      data: topologyData,
      isPending: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('does not call topology write endpoints from the mobile screen', () => {
    const TopologyMapScreen = require('../../app/(app)/topology-map').default;

    render(<TopologyMapScreen />);

    expect(mockDeviceCreateModal).not.toHaveBeenCalled();
    expect(mockMapViewProps[0]?.onLongPress).toBeUndefined();
    expect(mockApiGet).not.toHaveBeenCalledWith(expect.stringMatching(/\/api\/map\//), expect.anything());
    expect(mockApiPost).not.toHaveBeenCalledWith(expect.stringMatching(/\/api\/map\//), expect.anything());
    expect(mockApiDelete).not.toHaveBeenCalledWith(expect.stringMatching(/\/api\/map\//), expect.anything());
  });

  it('does not offer destructive delete action when a connection line is selected', () => {
    const TopologyMapScreen = require('../../app/(app)/topology-map').default;

    render(<TopologyMapScreen />);

    const shapeSource = mockShapeSourceProps[0];
    expect(shapeSource?.onPress).toBeDefined();
    if (!shapeSource?.onPress) throw new Error('Expected onPress to be defined');

    shapeSource.onPress({
      features: [
        {
          properties: {
            edgeId: 'edge-1',
            sourceName: 'ODC 1',
            targetName: 'ODP 1',
            distance: '100m',
          },
        },
      ],
    } satisfies Parameters<NonNullable<MockShapeSourceProps['onPress']>>[0]);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Info Jalur Kabel',
      expect.stringContaining('ODC 1'),
      [{ text: 'Tutup' }],
    );
  });
});

// <MapLibreGL.UserLocation visible> menyalakan GPS native MapLibre selama
// ter-mount (LocationManager.addListener → MLRNLocationModule.start), sedangkan
// layar tab ini tetap ter-mount setelah pengguna pindah ke layar lain.
describe('topology map location tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserLocationRenders.length = 0;
    mockUserLocation = [106.8, -6.2];
    mockUseApiQuery.mockReturnValue({
      data: topologyData,
      isPending: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('does not keep MapLibre location tracking mounted while the map screen is not focused', () => {
    mockIsScreenFocused = false;
    const TopologyMapScreen = require('../../app/(app)/topology-map').default;

    render(<TopologyMapScreen />);

    expect(mockUserLocationRenders).toHaveLength(0);
  });

  it('shows the user location marker while the map screen is focused', () => {
    mockIsScreenFocused = true;
    const TopologyMapScreen = require('../../app/(app)/topology-map').default;

    render(<TopologyMapScreen />);

    expect(mockUserLocationRenders.length).toBeGreaterThan(0);
  });
});
