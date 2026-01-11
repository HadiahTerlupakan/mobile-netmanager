import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Crosshair, MapPin, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface LocationPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectLocation: (lat: number, lng: number) => void;
    initialLocation?: { lat: number; lng: number };
}

MapLibreGL.setAccessToken(null);

export function LocationPickerModal({ visible, onClose, onSelectLocation, initialLocation }: LocationPickerModalProps) {
    const cameraRef = useRef<any>(null);
    const [center, setCenter] = useState<[number, number]>([106.816666, -6.200000]); // Default Jakarta
    const [isInitialized, setIsInitialized] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<any>(null);

    // Initial load
    useEffect(() => {
        const init = async () => {
            if (visible) {
                // Reset state when opening
                if (initialLocation) {
                    setCenter([initialLocation.lng, initialLocation.lat]);
                    setIsInitialized(true);
                } else {
                    // Start fresh detection
                    setIsInitialized(false);
                    setLoadingLocation(true); // Show loader inside FAB if needed, or main loader
                    await getCurrentLocation(true); // true = isInitial
                }
            } else {
                setIsInitialized(false);
                setSearchQuery(''); // Reset search
                setSuggestions([]);
            }
        };
        init();
    }, [visible]);

    // Memoize settings to prevent re-renders from "resetting" the map
    // We only want to set the center ONCE when the map becomes visible/initialized.
    // Subsequent moves (drag or search) are imperative or update 'center' state only for UI.
    const mapStyle = React.useMemo(() => ({
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
    }), []);

    const cameraSettings = React.useMemo(() => ({
        centerCoordinate: center,
        zoomLevel: 15,
    }), [isInitialized]);

    const getCurrentLocation = async (isInitialId = false) => {
        try {
            if (!isInitialId) setLoadingLocation(true);
            
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Lokasi', 'Aktifkan izin lokasi untuk menggunakan fitur ini.');
                // Fallback to Jakarta if permission denied
                if (isInitialId) {
                    setCenter([106.816666, -6.200000]); 
                    setIsInitialized(true);
                }
                return;
            }

            // Try last known first for speed if initial
            let location = await Location.getLastKnownPositionAsync({});
            if (!location) {
                 location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced // Balanced is faster than High
                });
            }

            const newCenter: [number, number] = [location.coords.longitude, location.coords.latitude];
            setCenter(newCenter);
            
            if (isInitialId) {
                // If initial, we are ready to show map now
                setIsInitialized(true);
            } else {
                // If user clicked FAB, move camera
                if (cameraRef.current) {
                    cameraRef.current.setCamera({
                        centerCoordinate: newCenter,
                        zoomLevel: 15,
                        animationDuration: 1000,
                    });
                }
            }
        } catch (error) {
            console.error('Error getting location', error);
            if (isInitialId) {
                 // Fallback on error so user isn't stuck
                 setIsInitialized(true);
            } else {
                 Alert.alert('Gagal', 'Tidak dapat mengambil lokasi saat ini. Pastikan GPS aktif.');
            }
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
                // Use OSM Nominatim for suggestions
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&countrycodes=id`,
                    {
                        headers: {
                            'User-Agent': 'NetManagerMobile/1.0'
                        }
                    }
                );
                const data = await response.json();
                setSuggestions(data);
            } catch (error) {
                console.error('OSM Search Error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 500) as any; // Cast to any to avoid type mismatch between NodeJS.Timeout and number
    };

    const handleSelectSuggestion = (item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const newCenter: [number, number] = [lng, lat];
        
        setCenter(newCenter);
        setSearchQuery(item.display_name.split(',')[0]); // Shorten name for display
        setSuggestions([]); // Close dropdown

        if (cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: newCenter,
                zoomLevel: 16,
                animationDuration: 1000,
            });
        }
    };

    const handleSelect = async () => {
        // Since we track center via onRegionDidChange, we just use 'center' state
        if (center) {
            onSelectLocation(center[1], center[0]); // Lat, Lng
        }
    };

    const onRegionDidChange = (e: any) => {
        const { geometry } = e;
        if (geometry && geometry.coordinates) {
            setCenter(geometry.coordinates);
        }
    };

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
                             returnKeyType="search"
                             onSubmitEditing={() => Keyboard.dismiss()} 
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
                <View style={tw`flex-1 relative justify-center`}>
                    {!isInitialized ? (
                         <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
                             <ActivityIndicator size="large" color="#2563eb" />
                             <Text style={tw`text-gray-500 mt-4`}>Mencari lokasi...</Text>
                         </View>
                    ) : (
                        <MapLibreGL.MapView
                            style={tw`flex-1`}
                            mapStyle={mapStyle}
                            logoEnabled={false}
                            attributionEnabled={false}
                            onRegionDidChange={onRegionDidChange}
                        >
                            <MapLibreGL.Camera
                                ref={cameraRef}
                                defaultSettings={cameraSettings}
                                followUserLocation={false}
                            />
                        </MapLibreGL.MapView>
                    )}

                    {/* Center Marker Overlay */}
                    <View style={[StyleSheet.absoluteFill, tw`items-center justify-center pointer-events-none`]}>
                        <View style={tw`mb-8`}> 
                            <MapPin size={40} color="#ef4444" fill="white" />
                        </View>
                    </View>

                    {/* My Location FAB */}
                    <TouchableOpacity
                        onPress={() => getCurrentLocation(false)}
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
                                {isInitialized ? `${center[1].toFixed(6)}, ${center[0].toFixed(6)}` : '- , -'}
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
