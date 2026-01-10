import LoadingModal from '@/components/LoadingModal';
import SelectionModal from '@/components/SelectionModal';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { SyncService } from '@/services/SyncService';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import tw from 'twrnc';

interface Gudang {
    id: string;
    nama: string;
    kode?: string;
}

interface Barang {
    id: string;
    kode: string;
    nama: string;
    satuan: string;
}

interface PhotoWithMeta {
    uri: string;
    width: number;
    height: number;
    capturedAt: Date;
}

const KONDISI_OPTIONS = [
    { label: 'Baru', value: 'BARU' },
    { label: 'Bekas', value: 'BEKAS' },
    { label: 'Rusak', value: 'RUSAK' }
];

export default function BarangMasukScreen() {
    const router = useRouter();
    const { token, user } = useAuth();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const pickerItemColor = isDarkMode ? '#FFFFFF' : '#1F2937';
    // Ensure the collapsed picker text is always dark because our container is bg-white
    const pickerStyle = { color: '#1F2937' };


    const [gudangs, setGudangs] = useState<Gudang[]>([]);
    const [barangs, setBarangs] = useState<Barang[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [selectedGudang, setSelectedGudang] = useState('');
    const [selectedBarang, setSelectedBarang] = useState('');
    const [jumlah, setJumlah] = useState('');
    const [kondisi, setKondisi] = useState('BARU');
    const [keterangan, setKeterangan] = useState('');
    const [photos, setPhotos] = useState<PhotoWithMeta[]>([]);

    // Modal state
    const [showGudangModal, setShowGudangModal] = useState(false);
    const [showBarangModal, setShowBarangModal] = useState(false);
    
    // Loading state
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showLoading, setShowLoading] = useState(false);

    // Refs for watermark capture
    const watermarkRefs = useRef<(View | null)[]>([]);

    const { mutate, isLoading: isMutating } = useOfflineMutation();

    // Offline Query: Gudangs
    const { data: gudangData } = useOfflineQuery<Gudang[]>({
        key: 'gudang_list',
        fetcher: async () => {
             const res = await axios.get(`${Config.API_URL}/api/mobile/inventory/gudang`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.gudangList || res.data?.data || [];
        },
        enabled: !!token
    });

    useEffect(() => {
        if (gudangData) setGudangs(gudangData);
    }, [gudangData]);

    // Offline Query: Barangs - mode=masuk to get ALL master barang (GLOBAL CACHE)
    const { data: barangData } = useOfflineQuery<Barang[]>({
        key: `barang_list_master`,
        fetcher: async () => {
             const res = await axios.get(`${Config.API_URL}/api/mobile/inventory/barang?mode=masuk`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.barangList || [];
        },
        enabled: !!token
    });

    useEffect(() => {
        if (barangData) setBarangs(barangData);
    }, [barangData]);

    // Helper to resize image
    const resizeImage = async (uri: string): Promise<{ uri: string; width: number; height: number }> => {
        try {
            const manipResult = await manipulateAsync(
                uri,
                [{ resize: { width: 1080 } }], // Resize to 1080px width, auto height
                { compress: 0.8, format: SaveFormat.JPEG }
            );
            return {
                uri: manipResult.uri,
                width: manipResult.width,
                height: manipResult.height
            };
        } catch (error) {
            console.error('Failed to resize image:', error);
            // Fallback to original if resize fails (though unlikely)
            return { uri, width: 800, height: 600 }; 
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Izin akses galeri diperlukan');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false, // We resize manually
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            // Resize immediately
            const resized = await resizeImage(asset.uri);
            setPhotos([...photos, {
                uri: resized.uri,
                width: resized.width,
                height: resized.height,
                capturedAt: new Date()
            }]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Izin akses kamera diperlukan');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            // Resize immediately
            const resized = await resizeImage(asset.uri);
            setPhotos([...photos, {
                uri: resized.uri,
                width: resized.width,
                height: resized.height,
                capturedAt: new Date()
            }]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const captureWatermarkedPhoto = async (index: number): Promise<string | null> => {
        const ref = watermarkRefs.current[index];
        if (!ref) return photos[index]?.uri || null;

        try {
            const uri = await captureRef(ref, {
                format: 'jpg',
                quality: 0.8,
            });
            return uri;
        } catch (error) {
            console.error('Watermark capture error:', error);
            return photos[index]?.uri || null;
        }
    };

    const processPhotos = async (): Promise<string[]> => {
        const processedUris: string[] = [];
        for (let i = 0; i < photos.length; i++) {
            const watermarkedUri = await captureWatermarkedPhoto(i);
            if (watermarkedUri) processedUris.push(watermarkedUri);
        }
        return processedUris;
    };

    const uploadPhotos = async (uris: string[]): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        console.log('[Upload] Starting upload for URIs:', uris);

        for (const uri of uris) {
            try {
                const formData = new FormData();
                const filename = uri.split('/').pop() || 'photo.jpg';
                const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
                
                console.log('[Upload] Processing Image:', { uri, filename, fileType });

                formData.append('file', {
                    uri: uri,
                    type: fileType,
                    name: filename,
                } as any);
                formData.append('type', 'inventory-masuk');

                console.log('[Upload] Sending request to:', `${Config.API_URL}/api/mobile/upload`);

                const res = await axios.post(`${Config.API_URL}/api/mobile/upload`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    transformRequest: (data, headers) => {
                        // React Native handles FormData automatically, but sometimes explicit return is safer to debug
                        return data;
                    },
                });

                console.log('[Upload] Success:', res.status, res.data);

                if (res.data?.url) {
                    uploadedUrls.push(res.data.url);
                }
            } catch (error: any) {
                console.error('Failed to upload photo:', error);
                if (error.response) {
                    console.error('[Upload] Error Response:', error.response.status, error.response.data);
                } else if (error.request) {
                    console.error('[Upload] No Response (Network Error):', error.request);
                } else {
                    console.error('[Upload] Request Setup Error:', error.message);
                }
            }
        }
        return uploadedUrls;
    };

    const resetForm = () => {
        setSelectedBarang('');
        setJumlah('');
        setKondisi('BARU');
        setKeterangan('');
        setPhotos([]);
    };

    const handleSubmit = async () => {
        if (!selectedGudang || !selectedBarang || !jumlah) {
            Alert.alert('Error', 'Gudang, Barang, dan Jumlah wajib diisi');
            return;
        }

        const qty = parseInt(jumlah);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Error', 'Jumlah harus berupa angka positif');
            return;
        }

        // 1. Process Photos (Capture Watermark)
        setShowLoading(true);
        setLoadingMessage('Memproses foto...');

        try {
            const processedPhotos = await processPhotos();
            
            // 2. Check Connection
            const isOnline = await SyncService.isOnline();
            
            // 3. Prepare Data
            const payload = {
                barangId: selectedBarang,
                gudangId: selectedGudang,
                jumlah: qty,
                kondisi,
                keterangan,
            };

            if (isOnline) {
                setSubmitting(true);
                try {
                    // Upload photos first
                    setLoadingMessage('Mengupload foto...');
                    const uploadedUrls = await uploadPhotos(processedPhotos);
                    
                    // Submit via Mutate (Online)
                    setLoadingMessage('Menyimpan data...');
                    await mutate({
                        ...payload,
                        fotoBukti: uploadedUrls
                    }, {
                        url: '/api/mobile/inventory/masuk',
                        method: 'POST',
                        onSuccess: () => {
                            setShowLoading(false);
                            resetForm();
                            Alert.alert('Sukses', 'Barang masuk berhasil dicatat', [
                                { text: 'OK', onPress: () => router.replace('/(app)/barang') }
                            ]);
                        },
                        onError: (err) => {
                            setShowLoading(false);
                            Alert.alert('Error', err.message || 'Gagal menyimpan data');
                        }
                    });

                } catch (error) {
                    setShowLoading(false);
                    Alert.alert('Error', 'Gagal upload foto atau simpan data');
                } finally {
                    setSubmitting(false);
                }
            } else {
                 // Offline - Submit to Queue with Local URIs
                 setLoadingMessage('Menyimpan ke antrian offline...');
                 await mutate({
                    ...payload,
                    fotoBukti: [], // Placeholder
                    meta: {
                        photos: processedPhotos, // Local URIs for SyncService
                        targetField: 'fotoBukti' 
                    }
                }, {
                    url: '/api/mobile/inventory/masuk',
                    method: 'POST',
                    onSuccess: (data, isOffline) => {
                        setShowLoading(false);
                        if (isOffline) {
                            resetForm();
                            router.back();
                        }
                    },
                    onError: () => {
                        setShowLoading(false);
                    }
                });
            }
        } catch (error) {
            setShowLoading(false);
            console.error(error);
            Alert.alert('Error', 'Terjadi kesalahan saat memproses data');
        }
    };

    const selectedBarangData = barangs.find(b => b.id === selectedBarang);
    const selectedBarangName = selectedBarangData ? `${selectedBarangData.kode} - ${selectedBarangData.nama}` : '';
    const selectedGudangData = gudangs.find(g => g.id === selectedGudang);

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-100`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900`}>Barang Masuk</Text>
                    <View style={tw`w-8`} />
                </View>
            </View>

            <ScrollView style={tw`flex-1`} keyboardShouldPersistTaps="handled">
                <View style={tw`p-4`}>
                    {/* Gudang Selection - Custom Modal */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Gudang *</Text>
                        <TouchableOpacity
                            onPress={() => setShowGudangModal(true)}
                            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between h-14`}
                        >
                            <Text style={tw`${selectedGudang ? 'text-gray-900' : 'text-gray-400'} text-base`}>
                                {selectedGudangData ? selectedGudangData.nama : 'Pilih Gudang...'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    {/* Barang Selection - Custom Modal */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Barang *</Text>
                        <TouchableOpacity
                            onPress={() => setShowBarangModal(true)}
                            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between h-14`}
                        >
                            <Text style={tw`${selectedBarang ? 'text-gray-900' : 'text-gray-400'} text-base flex-1 mr-2`} numberOfLines={1}>
                                {selectedBarangName || 'Pilih Barang...'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                        
                        {selectedBarangData && (
                            <View style={tw`mt-2 p-3 bg-blue-50 rounded-lg`}>
                                <Text style={tw`text-xs text-blue-700 font-medium`}>
                                    Satuan: {selectedBarangData.satuan}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Kondisi - Keep standard Picker for small list */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Kondisi</Text>
                        <View style={tw`bg-white border border-gray-200 rounded-xl overflow-hidden justify-center h-14`}>
                            <Picker
                                selectedValue={kondisi}
                                onValueChange={(itemValue) => setKondisi(String(itemValue))}
                                style={pickerStyle}
                                dropdownIconColor={isDarkMode ? '#FFFFFF' : '#1F2937'}
                            >
                                {KONDISI_OPTIONS.map(k => (
                                    <Picker.Item key={k.value} label={k.label} value={k.value} color={pickerItemColor} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Jumlah */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Jumlah *</Text>
                        <TextInput
                            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-base`}
                            placeholder="Masukkan jumlah"
                            keyboardType="numeric"
                            value={jumlah}
                            onChangeText={setJumlah}
                        />
                    </View>

                    {/* Keterangan */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Keterangan</Text>
                        <TextInput
                            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-base h-24`}
                            placeholder="Catatan tambahan (opsional)"
                            value={keterangan}
                            onChangeText={setKeterangan}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Photo Upload */}
                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Foto Bukti</Text>

                        {/* Small Thumbnail Grid */}
                        {photos.length > 0 && (
                            <View style={tw`flex-row flex-wrap gap-2 mb-3`}>
                                {photos.map((photo, index) => (
                                    <View key={index} style={tw`relative`}>
                                        <Image
                                            source={{ uri: photo.uri }}
                                            style={tw`w-20 h-20 rounded-lg`}
                                        />
                                        <TouchableOpacity
                                            style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1`}
                                            onPress={() => removePhoto(index)}
                                        >
                                            <Ionicons name="close" size={14} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Hidden Watermark Views for Capture */}
                         <View style={[tw`absolute`, { top: 0, left: 0, right: 0, opacity: 0, zIndex: -10 }]} pointerEvents="none">
                            {photos.map((photo, index) => (
                                <View
                                    key={index}
                                    ref={(ref) => { watermarkRefs.current[index] = ref; }}
                                    collapsable={false}
                                    style={{ width: photo.width, height: photo.height, backgroundColor: 'black' }}
                                >
                                    <Image
                                        source={{ uri: photo.uri }}
                                        style={{ width: photo.width, height: photo.height }}
                                        resizeMode="contain"
                                    />
                                    {/* Watermark Overlay - Dynamic Sizing */}
                                    <View style={[
                                        tw`absolute bottom-0 left-0 right-0 bg-black/70`,
                                        { padding: photo.width * 0.04 }
                                    ]}>
                                        <Text style={{ 
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            marginBottom: photo.width * 0.01,
                                            fontSize: photo.width * 0.05 
                                        }}>
                                            📦 BARANG MASUK
                                        </Text>
                                        <Text style={{ 
                                            color: 'white', 
                                            fontSize: photo.width * 0.035,
                                            marginBottom: photo.width * 0.005
                                        }}>
                                            {selectedBarangName || 'Memilih barang...'}
                                        </Text>
                                        <Text style={{ 
                                            color: 'white', 
                                            fontSize: photo.width * 0.035,
                                            marginBottom: photo.width * 0.02
                                        }}>
                                            Jumlah: {jumlah || '0'} | Kondisi: {kondisi}
                                        </Text>
                                        <View style={tw`flex-row items-center mt-1`}>
                                            <Text style={{ 
                                                color: 'rgba(255,255,255,0.8)', 
                                                fontSize: photo.width * 0.03 
                                            }}>
                                                ⏰ {format(photo.capturedAt, 'HH:mm:ss')} • {format(photo.capturedAt, 'd MMM yyyy', { locale: idLocale })}
                                            </Text>
                                        </View>
                                        <Text style={{ 
                                            color: 'rgba(255,255,255,0.6)', 
                                            fontSize: photo.width * 0.03,
                                            marginTop: photo.width * 0.01
                                        }}>
                                            👤 {user?.name || 'User'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Photo Buttons */}
                        <View style={tw`flex-row gap-3`}>
                            <TouchableOpacity
                                style={tw`flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3`}
                                onPress={takePhoto}
                            >
                                <Ionicons name="camera" size={20} color="#3B82F6" />
                                <Text style={tw`ml-2 text-blue-600 font-medium`}>Kamera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={tw`flex-1 flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3`}
                                onPress={pickImage}
                            >
                                <Ionicons name="images" size={20} color="#3B82F6" />
                                <Text style={tw`ml-2 text-blue-600 font-medium`}>Galeri</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={tw`bg-blue-600 rounded-xl py-4 items-center ${(submitting || isMutating) ? 'opacity-50' : ''}`}
                        onPress={handleSubmit}
                        disabled={submitting || isMutating}
                    >
                        {(submitting || isMutating) ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={tw`text-white font-bold text-base`}>Simpan</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* MODALS */}
            <SelectionModal
                visible={showGudangModal}
                onClose={() => setShowGudangModal(false)}
                title="Pilih Gudang"
                searchPlaceholder="Cari gudang..."
                items={gudangs.map(g => ({
                    id: g.id,
                    label: g.nama,
                    subLabel: g.kode,
                    value: g.id
                }))}
                onSelect={(item) => setSelectedGudang(item.value)}
                selectedValue={selectedGudang}
            />

            <SelectionModal
                visible={showBarangModal}
                onClose={() => setShowBarangModal(false)}
                title="Pilih Barang"
                searchPlaceholder="Cari barang..."
                items={barangs.map(b => ({
                    id: b.id,
                    label: b.nama,
                    subLabel: b.kode,
                    value: b.id
                }))}
                onSelect={(item) => setSelectedBarang(item.value)}
                selectedValue={selectedBarang}
            />

            <LoadingModal 
                visible={showLoading} 
                message={loadingMessage} 
            />
        </View>
    );
}
