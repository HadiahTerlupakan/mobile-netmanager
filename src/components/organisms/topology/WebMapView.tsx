/**
 * WebMapView - MapLibre GL JS wrapper for web platform
 * This component provides map functionality on web using maplibre-gl
 */

import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { RefreshCw, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// Only import maplibre-gl on web platform
let maplibregl: typeof import('maplibre-gl') | null = null;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  maplibregl = require('maplibre-gl');
}

// Types
export type DeviceType = 'otb' | 'odc' | 'odp' | 'joinbox' | 'pole' | 'pelanggan' | 'kmz';

interface WebMapViewProps {
  devices: {
    type: DeviceType;
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    color: string;
    properties?: Record<string, any>;
  }[];
  lines: {
    id?: string;
    coordinates: [number, number][];
    color: string;
    sourceName?: string;
    targetName?: string;
  }[];
  visibility: Record<string, boolean>;
  onDevicePress?: (device: any) => void;
  onRefresh?: () => void;
  loading?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

const MARKER_COLORS: Record<DeviceType, string> = {
  otb: '#9333ea',
  odc: '#2563eb',
  odp: '#06b6d4',
  joinbox: '#a855f7',
  pole: '#6b7280',
  pelanggan: '#ea580c',
  kmz: '#6366f1',
};

// Device type to text label for markers (safer than innerHTML)
const getDeviceLabel = (type: DeviceType): string => {
  const labels: Record<DeviceType, string> = {
    otb: 'S',
    odc: 'D',
    odp: 'P',
    joinbox: 'J',
    pole: 'L',
    pelanggan: 'H',
    kmz: 'K',
  };
  return labels[type] || '?';
};

export function WebMapView({
  devices,
  lines,
  visibility,
  onDevicePress,
  onRefresh,
  loading = false,
  initialCenter = [106.816666, -6.2],
  initialZoom = 12,
}: WebMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Initialize map
  useEffect(() => {
    if (!maplibregl || !mapContainer.current || map.current) return;

    // Add CSS for maplibre-gl
    const link = document.createElement('link');
    link.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'google-satellite': {
            type: 'raster',
            tiles: ['https://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}'],
            tileSize: 256,
            attribution: '© Google Maps',
          },
        },
        layers: [
          {
            id: 'google-satellite-layer',
            type: 'raster',
            source: 'google-satellite',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: initialCenter,
      zoom: initialZoom,
    }) as any;

    map.current!.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialCenter, initialZoom]);

  // Update lines when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !visibility.lines) return;

    // Remove existing line layers and sources
    if (map.current.getLayer('connection-lines')) {
      map.current.removeLayer('connection-lines');
    }
    if (map.current.getSource('lines-source')) {
      map.current.removeSource('lines-source');
    }

    // Add line source
    const lineFeatures = lines.map((line, index) => ({
      type: 'Feature' as const,
      properties: {
        color: line.color,
        sourceName: line.sourceName,
        targetName: line.targetName,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: line.coordinates,
      },
    }));

    map.current.addSource('lines-source', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: lineFeatures,
      },
    });

    map.current.addLayer({
      id: 'connection-lines',
      type: 'line',
      source: 'lines-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
        'line-opacity': 0.8,
      },
    });
  }, [lines, mapLoaded, visibility.lines]);

  // Update markers when devices change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Filter devices based on visibility
    const visibleDevices = devices.filter(d => visibility[d.type]);

    // Add new markers
    visibleDevices.forEach(device => {
      // Create marker element using safe DOM methods (no innerHTML)
      const el = document.createElement('div');
      el.className = 'device-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = device.color || MARKER_COLORS[device.type];
      el.style.border = '2px solid white';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.fontSize = '14px';

      // Use textContent instead of innerHTML for safety
      el.textContent = getDeviceLabel(device.type);

      el.addEventListener('click', () => {
        if (onDevicePress) {
          onDevicePress(device);
        }
      });

      const marker = new maplibregl!.Marker({ element: el })
        .setLngLat([device.longitude, device.latitude])
        .addTo(map.current as any);

      markersRef.current.push(marker);
    });
  }, [devices, mapLoaded, visibility, onDevicePress]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = devices.filter(d => {
      const name = (d.name || '').toLowerCase();
      return name.includes(query);
    });

    setSearchResults(filtered.slice(0, 10));
  }, [searchQuery, devices]);

  const handleSearchResultPress = (device: any) => {
    setSearchQuery('');
    setSearchResults([]);

    if (map.current) {
      map.current.flyTo({
        center: [device.longitude, device.latitude],
        zoom: 18,
        duration: 1000,
      });
    }

    if (onDevicePress) {
      onDevicePress(device);
    }
  };

  // Fit bounds to all devices
  const fitToDevices = useCallback(() => {
    if (!map.current || devices.length === 0) return;

    const bounds = new maplibregl!.LngLatBounds();
    devices.forEach(d => {
      bounds.extend([d.longitude, d.latitude]);
    });

    map.current.fitBounds(bounds as any, {
      padding: 50,
      duration: 1000,
    });
  }, [devices]);

  // Auto-fit when devices load
  useEffect(() => {
    if (mapLoaded && devices.length > 0) {
      fitToDevices();
    }
  }, [mapLoaded, devices.length, fitToDevices]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari perangkat..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((device, index) => (
              <TouchableOpacity
                key={`${device.type}-${device.id}-${index}`}
                style={styles.searchResultItem}
                onPress={() => handleSearchResultPress(device)}
              >
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: device.color || MARKER_COLORS[device.type as DeviceType] },
                  ]}
                />
                <View>
                  <Text style={styles.resultName}>{device.name}</Text>
                  <Text style={styles.resultType}>{String(device.type).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Loading Overlay */}
      {(loading || !mapLoaded) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>
            {loading ? 'Memuat data...' : 'Memuat peta...'}
          </Text>
        </View>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <RefreshCw size={20} color="#3b82f6" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    height: 40,
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  resultType: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
});

export default WebMapView;
