import MapLibreGL from '@maplibre/maplibre-react-native';
import { DOMParser } from '@xmldom/xmldom';
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
import api from '../../services/api';
import toGeoJSON from '../../utils/togeojson-wrapper';

import { DeviceData, DeviceDetailModal, DeviceType } from '../../components/topology/DeviceDetailModal';
import { FilterPanel } from '../../components/topology/FilterPanel';

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
  kmzFiles?: Array<{
    id: string;
    name: string;
    kmlPath: string;
    lineColor: string;
    isActive: boolean;
  }>;
}

interface VisibilityState {
  otb: boolean;
  odc: boolean;
  odp: boolean;
  joinbox: boolean;
  pole: boolean;
  pelanggan: boolean;
  kmz: boolean;
}

// Marker colors
const MARKER_COLORS: Record<DeviceType, string> = {
  otb: '#3b82f6',
  odc: '#10b981',
  odp: '#f97316',
  joinbox: '#a855f7',
  pole: '#6b7280',
  pelanggan: '#ec4899',
  kmz: '#6366f1',
};

// MapLibre Config
MapLibreGL.setAccessToken(null); // Not needed for open tiles

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
      pelanggan: true,
      kmz: true,
  });
  
  const [kmzFeatures, setKmzFeatures] = useState<any[]>([]);
  
  const [selectedDevice, setSelectedDevice] = useState<{
      data: DeviceData;
      type: DeviceType;
  } | null>(null);
  
  const [showFilters, setShowFilters] = useState(true);

  const { token } = useAuth();

  // Fetch topology data
  const fetchData = useCallback(async () => {
    console.log('FetchData called. Token:', token ? 'Present' : 'Missing');
    if (!token) {
        console.log('No token available - aborting fetch');
        return;
    }

    try {
        setLoading(true);
        console.log('Fetching topology from /api/mobile/topology...');
        const response = await api.get('/api/mobile/topology');
        console.log('Topology Response Status:', response.status);
        console.log('Topology Data Keys:', Object.keys(response.data));
        console.log('OTB Count:', response.data.otbs?.length);
        console.log('ODP Count:', response.data.odps?.length);
        console.log('KMZ Count:', response.data.kmzFiles?.length);
        setData(response.data); 
    } catch (err: any) {
        console.error('Error fetching topology:', err);
        console.error('Error Details:', err.response?.data);
        setError(err.response?.data?.error || 'Gagal memuat data topologi');
        Alert.alert('Error', 'Gagal memuat data topologi: ' + (err.message || 'Unknown error'));
    } finally {
        setLoading(false);
    }
  }, [token]);

  // Parse KMZ/KML files when data changes
  useEffect(() => {
    async function loadKmzData() {
      if (!data?.kmzFiles || data.kmzFiles.length === 0) {
        setKmzFeatures([]);
        return;
      }

      console.log('Loading KMZ files:', data.kmzFiles.length);
      const allFeatures: any[] = [];

      for (const file of data.kmzFiles) {
        if (!file.kmlPath) continue;
        
        try {
            // Check if path is absolute
            const url = file.kmlPath.startsWith('http') 
                ? file.kmlPath 
                : `${api.defaults.baseURL}${file.kmlPath.startsWith('/') ? '' : '/'}${file.kmlPath}`;

            console.log(`Fetching KML from: ${url}`);
            const response = await fetch(url);
            const text = await response.text();
            
            const parser = new DOMParser();
            const kmlDom = parser.parseFromString(text, 'text/xml');
            const geoJson = toGeoJSON.kml(kmlDom);
            
            if (geoJson.features) {
                // Add styling properties
                geoJson.features.forEach((feature: any) => {
                    if (!feature.properties) feature.properties = {};
                    feature.properties.color = file.lineColor || '#6366f1';
                    feature.properties.kmzId = file.id;
                    feature.properties.sourceFile = file.name;
                });
                
                allFeatures.push(...geoJson.features);
            }
        } catch (e) {
            console.error(`Error loading KML ${file.name}:`, e);
        }
      }
      
      console.log(`Loaded ${allFeatures.length} KMZ features`);
      setKmzFeatures(allFeatures);
    }

    if (data) {
        loadKmzData();
    }
  }, [data]);

  useEffect(() => {
    if (token) {
        fetchData();
    }
  }, [fetchData, token]);

  // Connection lines GeoJSON
  const connectionLines = useMemo(() => {
    if (!data) return { type: 'FeatureCollection', features: [] };

    const features: any[] = [];

    // ODC to OTB connections
    if (visibility.odc && visibility.otb) {
      data.odcs.forEach((odc) => {
        if (odc.otbCore?.otb) {
          features.push({
            type: 'Feature',
            properties: { color: '#10b981' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [odc.longitude, odc.latitude],
                [odc.otbCore.otb.longitude, odc.otbCore.otb.latitude],
              ],
            },
          });
        }
      });
    }

    // ODP to ODC connections
    if (visibility.odp && visibility.odc) {
      data.odps.forEach((odp) => {
        if (odp.odcOutput?.odc) {
          features.push({
            type: 'Feature',
            properties: { color: '#f97316' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [odp.longitude, odp.latitude],
                [odp.odcOutput.odc.longitude, odp.odcOutput.odc.latitude],
              ],
            },
          });
        }
      });
    }

    // Pelanggan to ODP connections
    if (visibility.pelanggan && visibility.odp) {
      data.pelanggans.forEach((pelanggan) => {
        if (pelanggan.odp) {
          features.push({
            type: 'Feature',
            properties: { color: '#ec4899' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [pelanggan.longitude, pelanggan.latitude],
                [pelanggan.odp.longitude, pelanggan.odp.latitude],
              ],
            },
          });
        }
      });
    }

    return { type: 'FeatureCollection', features };
  }, [data, visibility]);

  // KMZ GeoJSON
  const kmzGeoJson = useMemo(() => {
    if (!visibility.kmz || !kmzFeatures || kmzFeatures.length === 0) {
        return { type: 'FeatureCollection', features: [] };
    }
    return { type: 'FeatureCollection', features: kmzFeatures };
  }, [visibility.kmz, kmzFeatures]);

  // Markers
  const allMarkers = useMemo(() => {
    if (!data) return [];
    
    const markers: Array<{
        id: string;
        latitude: number;
        longitude: number;
        color: string;
        title: string;
        type: DeviceType;
        data: any; // Original device object
    }> = [];

    if (visibility.otb) {
        data.otbs.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.otb, title: d.name, type: 'otb', data: d
        }));
    }
    if (visibility.odc) {
        data.odcs.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.odc, title: d.name, type: 'odc', data: d
        }));
    }
    if (visibility.odp) {
        data.odps.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.odp, title: d.name, type: 'odp', data: d
        }));
    }
    if (visibility.joinbox) {
        data.joinboxes.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.joinbox, title: d.name, type: 'joinbox', data: d
        }));
    }
    if (visibility.pole) {
        data.poles.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.pole, title: d.name, type: 'pole', data: d
        }));
    }
    if (visibility.pelanggan) {
        data.pelanggans.forEach(d => markers.push({
            id: d.id, latitude: d.latitude, longitude: d.longitude,
            color: MARKER_COLORS.pelanggan, title: d.nama || d.idPelanggan, type: 'pelanggan', data: d
        }));
    }

    return markers;
  }, [data, visibility]);

  // Counts for filter panel
  const counts = useMemo(() => {
    if (!data) return { otb: 0, odc: 0, odp: 0, joinbox: 0, pole: 0, pelanggan: 0, kmz: 0 };
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
      kmz: data.kmzFiles?.length || 0,
    };
  }, [data]);

  const handleToggleVisibility = (type: DeviceType) => {
    setVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleMarkerPress = (device: any, type: DeviceType) => {
    if (device) {
        setSelectedDevice({ data: device, type: type });
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

  // Calculate center coordinate
  let centerCoordinate = [106.816666, -6.2]; // Default Jakarta
  if (data && (data.otbs.length > 0 || data.odcs.length > 0)) {
     // Naive center finding, just take the first OTB or ODC
     if (data.otbs.length > 0) {
         centerCoordinate = [data.otbs[0].longitude, data.otbs[0].latitude];
     } else if (data.odcs.length > 0) {
         centerCoordinate = [data.odcs[0].longitude, data.odcs[0].latitude];
     }
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

      {/* Map Content - Using mapStyle prop (v10+) */}
      <MapLibreGL.MapView
        style={styles.map}
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
        logoEnabled={false}
      >
        <MapLibreGL.Camera
          zoomLevel={12}
          centerCoordinate={centerCoordinate}
          animationMode={'flyTo'}
          animationDuration={2000}
        />

        {/* Connection Lines (GeoJSON) */}
        <MapLibreGL.ShapeSource id="linesSource" shape={connectionLines as any}>
          <MapLibreGL.LineLayer
            id="linesLayer"
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 2,
              lineDasharray: [2, 2],
            }}
          />
        </MapLibreGL.ShapeSource>

        {/* KMZ/KML Layers */}
        <MapLibreGL.ShapeSource id="kmzSource" shape={kmzGeoJson as any}>
            <MapLibreGL.LineLayer
                id="kmzLineLayer"
                style={{
                    lineColor: ['get', 'color'],
                    lineWidth: 3,
                    lineOpacity: 0.8,
                }}
            />

        </MapLibreGL.ShapeSource>

        {/* Device Markers (PointAnnotation) */}
        {allMarkers.map(marker => (
          <MapLibreGL.PointAnnotation
            key={`${marker.type}-${marker.id}`}
            id={`${marker.type}-${marker.id}`}
            coordinate={[
                parseFloat(String(marker.longitude || 0)),
                parseFloat(String(marker.latitude || 0))
            ]} // MapLibre uses [lon, lat]
            onSelected={() => handleMarkerPress(marker.data, marker.type)}
          >
             <View style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: 'white',
                backgroundColor: marker.color
             }} />
          </MapLibreGL.PointAnnotation>
        ))}
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
    top: 110, // Move to top below header
    right: 16,
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5,
  },
  marker: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
  },
  markerInner: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'white',
  }
});
