/**
 * WebLocationPicker - MapLibre GL JS wrapper for location picking on web
 */

import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { logger } from '@/utils/logger';
import * as Location from 'expo-location';
import { Crosshair, MapPin, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import tw from 'twrnc';

// Only import maplibre-gl on web platform
let maplibregl: typeof import('maplibre-gl') | null = null;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  maplibregl = require('maplibre-gl');
}

interface WebLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

interface OSMSuggestion {
  lat: string;
  lon: string;
  display_name: string;
}

export function WebLocationPicker({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
}: WebLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [center, setCenter] = useState<[number, number]>([106.816666, -6.200000]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<OSMSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize map
  useEffect(() => {
    if (!visible || !maplibregl || !mapContainer.current) return;

    // Add CSS for maplibre-gl
    const existingLink = document.querySelector('link[href*="maplibre-gl.css"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const initialCenter: [number, number] = initialLocation
      ? [initialLocation.lng, initialLocation.lat]
      : [106.816666, -6.200000];

    setCenter(initialCenter);

    map.current = new maplibregl!.Map({
      container: mapContainer.current,
      style: {
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
      },
      center: initialCenter,
      zoom: 15,
    }) as any;

    map.current!.on('load', () => {
      setMapLoaded(true);

      // Get current location if no initial location
      if (!initialLocation) {
        getCurrentLocation();
      }
    });

    map.current!.on('move', () => {
      if (map.current) {
        const newCenter = map.current.getCenter();
        setCenter([newCenter.lng, newCenter.lat]);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [visible, initialLocation]);

  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('Location permission denied');
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      const newCenter: [number, number] = [location.coords.longitude, location.coords.latitude];
      setCenter(newCenter);

      if (map.current) {
        map.current.flyTo({
          center: newCenter,
          zoom: 15,
          duration: 1000,
        });
      }
    } catch (error) {
      logger.error('Error getting location', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=id`,
          {
            headers: {
              'User-Agent': 'RADPROMobile/1.0',
            },
          }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        logger.error('OSM Search Error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectSuggestion = (item: OSMSuggestion) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const newCenter: [number, number] = [lng, lat];

    setCenter(newCenter);
    setSearchQuery(item.display_name.split(',')[0]);
    setSuggestions([]);

    if (map.current) {
      map.current.flyTo({
        center: newCenter,
        zoom: 16,
        duration: 1000,
      });
    }
  };

  const handleSelect = () => {
    onSelectLocation(center[1], center[0]); // Lat, Lng
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between px-4 py-4 pt-12 border-b border-gray-100 bg-white z-20`}>
          <Text style={tw`text-lg font-bold text-gray-900`}>Pilih Lokasi</Text>
          <TouchableOpacity onPress={onClose} style={tw`p-2 bg-gray-100 rounded-full`}>
            <Text style={tw`text-gray-500 font-bold`}>Tutup</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={tw`px-4 py-2 bg-white z-20 border-b border-gray-100`}>
          <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-10`}>
            <Search size={20} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchTextChange}
              placeholder="Cari desa, jalan, atau kota..."
              style={tw`flex-1 ml-2 text-gray-900 h-full`}
              placeholderTextColor="#9ca3af"
            />
            {isSearching && <ActivityIndicator size="small" color="#2563eb" />}
          </View>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <View style={tw`absolute top-14 left-4 right-4 bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 z-30 overflow-hidden`}>
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={tw`p-3 border-b border-gray-100 flex-row items-center`}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <MapPin size={16} color="#6b7280" style={tw`mr-2`} />
                  <Text style={tw`text-sm text-gray-700 flex-1`} numberOfLines={2}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Map Container */}
        <View style={tw`flex-1 relative`}>
          {!mapLoaded ? (
            <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={tw`text-gray-500 mt-4`}>Memuat peta...</Text>
            </View>
          ) : null}

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

          {/* Center Marker Overlay */}
          <View style={[StyleSheet.absoluteFill, tw`items-center justify-center pointer-events-none`]}>
            <View style={tw`mb-8`}>
              <MapPin size={40} color="#ef4444" />
            </View>
          </View>

          {/* My Location FAB */}
          <TouchableOpacity
            onPress={getCurrentLocation}
            style={tw`absolute bottom-48 right-4 bg-white p-3 rounded-full shadow-lg border border-gray-100 items-center justify-center`}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Crosshair size={24} color="#2563eb" />
            )}
          </TouchableOpacity>

          {/* Bottom Selection Panel */}
          <View style={tw`absolute bottom-0 left-0 right-0 p-4 pb-12 bg-white rounded-t-3xl shadow-xl z-20`}>
            <View style={tw`w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4`} />
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs text-center text-gray-500 mb-1`}>Koordinat Terpilih</Text>
              <Text style={tw`text-sm font-mono text-center text-gray-900 bg-gray-50 py-2 rounded-lg`}>
                {mapLoaded ? `${center[1].toFixed(6)}, ${center[0].toFixed(6)}` : '- , -'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSelect}
              style={tw`bg-blue-600 py-4 rounded-xl items-center justify-center shadow-md shadow-blue-200`}
            >
              <Text style={tw`text-white font-bold text-base`}>Pilih Titik Ini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}



export default WebLocationPicker;
