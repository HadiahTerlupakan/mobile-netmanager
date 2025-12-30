import MapLibreGL from '@maplibre/maplibre-react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { ArrowLeft, Layers, RefreshCw } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

// Disable MapLibre verbose logging
MapLibreGL.setConnected(true);
if (MapLibreGL.Logger) {
  MapLibreGL.Logger.setLogLevel('error');
}

import { DeviceData, DeviceDetailModal, DeviceType } from '../../components/topology/DeviceDetailModal';
import { FilterPanel } from '../../components/topology/FilterPanel';
import { Config } from '../../constants/Config';

// Types
interface TopologyData {
  otbs: Array<{
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
  }>;
  odcs: Array<{
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
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
  }>;
  odps: Array<{
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
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
  }>;
  joinboxes: Array<{
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
  }>;
  poles: Array<{
    id: string;
    name: string;
    location: string | null;
    latitude: number;
    longitude: number;
    notes: string | null;
    cableSlack: boolean;
  }>;
  pelanggans: Array<{
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
  }>;
}

interface VisibilityState {
  otb: boolean;
  odc: boolean;
  odp: boolean;
  joinbox: boolean;
  pole: boolean;
  pelanggan: boolean;
}

// Marker colors
const MARKER_COLORS: Record<DeviceType, string> = {
  otb: '#3b82f6',
  odc: '#10b981',
  odp: '#f97316',
  joinbox: '#a855f7',
  pole: '#6b7280',
  pelanggan: '#ec4899',
};

export default function TopologyMapScreen() {
  const router = useRouter();
  const [data, setData] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [visibility, setVisibility] = useState({
      otb: true,
      odc: true,
      odp: true,
      pole: true,
      joinbox: true,
      pelanggan: true
  });
  
  const [selectedDevice, setSelectedDevice] = useState<{
      data: DeviceData;
      type: DeviceType;
  } | null>(null);
  
  const [showFilters, setShowFilters] = useState(true);

  const { token } = useAuth();

  // Fetch topology data
  const fetchData = useCallback(async () => {
    if (!token) {
        console.log('No token available');
        return;
    }

    try {
        setLoading(true);
        const response = await axios.get(`${Config.API_URL}/api/mobile/topology`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        setData(response.data); 
    } catch (err: any) {
        console.error('Error fetching topology:', err);
        setError(err.response?.data?.error || 'Gagal memuat data topologi');
        Alert.alert('Error', 'Gagal memuat data topologi');
    } finally {
        setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
        fetchData();
    }
  }, [fetchData, token]);

  // Calculate initial region based on data
  const initialRegion = useMemo(() => {
    if (!data) {
      return {
        latitude: -6.2,
        longitude: 106.816666,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const allCoords: Array<{ latitude: number; longitude: number }> = [
      ...data.otbs,
      ...data.odcs,
      ...data.odps,
      ...data.joinboxes,
      ...data.poles,
      ...data.pelanggans,
    ].filter((item) => item.latitude && item.longitude);

    if (allCoords.length === 0) {
      return {
        latitude: -6.2,
        longitude: 106.816666,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const avgLat = allCoords.reduce((sum, c) => sum + c.latitude, 0) / allCoords.length;
    const avgLon = allCoords.reduce((sum, c) => sum + c.longitude, 0) / allCoords.length;

    const latitudes = allCoords.map((c) => c.latitude);
    const longitudes = allCoords.map((c) => c.longitude);
    const latDelta = Math.max(0.01, (Math.max(...latitudes) - Math.min(...latitudes)) * 1.5);
    const lonDelta = Math.max(0.01, (Math.max(...longitudes) - Math.min(...longitudes)) * 1.5);

    return {
      latitude: avgLat,
      longitude: avgLon,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    };
  }, [data]);

  // Connection lines
  const connectionLines = useMemo(() => {
    if (!data) return [];

    const lines: Array<{
      id: string;
      coordinates: Array<{ latitude: number; longitude: number }>;
      color: string;
    }> = [];

    // ODC to OTB connections
    if (visibility.odc && visibility.otb) {
      data.odcs.forEach((odc) => {
        if (odc.otbCore?.otb) {
          lines.push({
            id: `odc-otb-${odc.id}`,
            coordinates: [
              { latitude: odc.latitude, longitude: odc.longitude },
              { latitude: odc.otbCore.otb.latitude, longitude: odc.otbCore.otb.longitude },
            ],
            color: '#10b981',
          });
        }
      });
    }

    // ODP to ODC connections
    if (visibility.odp && visibility.odc) {
      data.odps.forEach((odp) => {
        if (odp.odcOutput?.odc) {
          lines.push({
            id: `odp-odc-${odp.id}`,
            coordinates: [
              { latitude: odp.latitude, longitude: odp.longitude },
              { latitude: odp.odcOutput.odc.latitude, longitude: odp.odcOutput.odc.longitude },
            ],
            color: '#f97316',
          });
        }
      });
    }

    // Pelanggan to ODP connections
    if (visibility.pelanggan && visibility.odp) {
      data.pelanggans.forEach((pelanggan) => {
        if (pelanggan.odp) {
          lines.push({
            id: `pelanggan-odp-${pelanggan.id}`,
            coordinates: [
              { latitude: pelanggan.latitude, longitude: pelanggan.longitude },
              { latitude: pelanggan.odp.latitude, longitude: pelanggan.odp.longitude },
            ],
            color: '#ec4899',
          });
        }
      });
    }

    return lines;
  }, [data, visibility]);

  // Markers
  const allMarkers = useMemo(() => {
    if (!data) return [];
    
    const markers: Array<{
        id: string;
        latitude: number;
        longitude: number;
        color: string;
        title: string;
        type: string;
    }> = [];

    if (visibility.otb) {
        data.otbs.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.otb, title: d.name, type: 'otb'
        }));
    }
    if (visibility.odc) {
        data.odcs.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.odc, title: d.name, type: 'odc'
        }));
    }
    if (visibility.odp) {
        data.odps.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.odp, title: d.name, type: 'odp'
        }));
    }
    if (visibility.joinbox) {
        data.joinboxes.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.joinbox, title: d.name, type: 'joinbox'
        }));
    }
    if (visibility.pole) {
        data.poles.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.pole, title: d.name, type: 'pole'
        }));
    }
    if (visibility.pelanggan) {
        data.pelanggans.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.pelanggan, title: d.nama || d.idPelanggan, type: 'pelanggan'
        }));
    }

    return markers;
  }, [data, visibility]);

  // Counts for filter panel
  const counts = useMemo(() => {
    if (!data) return { otb: 0, odc: 0, odp: 0, joinbox: 0, pole: 0, pelanggan: 0 };
    return {
      otb: data.otbs.length,
      otbs: data.otbs.length, // Alias
      odc: data.odcs.length,
      odcs: data.odcs.length, // Alias
      odp: data.odps.length,
      odps: data.odps.length, // Alias
      joinbox: data.joinboxes.length,
      joinboxes: data.joinboxes.length, // Alias
      pole: data.poles.length,
      poles: data.poles.length, // Alias
      pelanggan: data.pelanggans.length,
      pelanggans: data.pelanggans.length, // Alias
    };
  }, [data]);

  const handleToggleVisibility = (type: DeviceType) => {
    setVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleMarkerPress = (id: string, type: string) => {
    if (!data) return;
    let device: any; // Using any temporarily or matching DeviceData

    // Helper to find device by ID in the correct array
    if (type === 'otb') device = data.otbs.find(d => d.id === id);
    else if (type === 'odc') device = data.odcs.find(d => d.id === id);
    else if (type === 'odp') device = data.odps.find(d => d.id === id);
    else if (type === 'joinbox') device = data.joinboxes.find(d => d.id === id);
    else if (type === 'pole') device = data.poles.find(d => d.id === id);
    else if (type === 'pelanggan') device = data.pelanggans.find(d => d.id === id);

    if (device) {
        setSelectedDevice({ data: device, type: type as DeviceType });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Memuat peta topologi...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <RefreshCw size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Topology Map</Text>
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Layers size={24} color={showFilters ? '#3b82f6' : '#6b7280'} />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          visibility={visibility}
          onToggle={handleToggleVisibility}
          counts={counts}
        />
      )}

      {/* Map Content */}
      <MapLibreGL.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
        mapStyle={{
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        }}
        onPress={(e: any) => {
          // Handle marker clicks via features
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.properties) {
              handleMarkerPress(feature.properties.id, feature.properties.deviceType);
            }
          }
        }}
      >
        <MapLibreGL.Camera
          centerCoordinate={[initialRegion.longitude, initialRegion.latitude]}
          zoomLevel={13}
        />

        {/* Connection Lines */}
        {connectionLines.length > 0 && (
          <MapLibreGL.ShapeSource
            id="connection-lines"
            shape={{
              type: 'FeatureCollection',
              features: connectionLines.map(line => ({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: line.coordinates.map(c => [c.longitude, c.latitude]),
                },
                properties: { id: line.id, color: line.color },
              })),
            }}
          >
            <MapLibreGL.LineLayer
              id="lines-layer"
              style={{
                lineColor: ['get', 'color'],
                lineWidth: 2,
                lineDasharray: [2, 2],
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Device Markers */}
        {allMarkers.length > 0 && (
          <MapLibreGL.ShapeSource
            id="device-markers"
            shape={{
              type: 'FeatureCollection',
              features: allMarkers.map(m => ({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [m.longitude, m.latitude],
                },
                properties: { id: m.id, deviceType: m.type, title: m.title, color: m.color },
              })),
            }}
            onPress={(e: any) => {
              if (e.features && e.features.length > 0) {
                const feature = e.features[0];
                handleMarkerPress(feature.properties.id, feature.properties.deviceType);
              }
            }}
          >
            <MapLibreGL.CircleLayer
              id="markers-layer"
              style={{
                circleRadius: 8,
                circleColor: ['get', 'color'],
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
        <RefreshCw size={20} color="#fff" />
      </TouchableOpacity>

      {/* Device Detail Modal */}
      <DeviceDetailModal
        visible={selectedDevice !== null}
        onClose={() => setSelectedDevice(null)}
        device={selectedDevice?.data || null}
        deviceType={selectedDevice?.type || null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterToggle: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3b82f6',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
