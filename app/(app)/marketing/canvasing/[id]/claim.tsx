import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import LoadingModal from '@/components/molecules/LoadingModal';
import api from '@/services/api'; // Use centralized API
import { uploadService } from '@/services/UploadService';
import { ClaimPointSchema, sanitizeInput, validateData } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import { logger } from '@/utils/logger';

export default function ClaimPointScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [buktiUrls, setBuktiUrls] = useState<string[]>([]);
    const [buktiMetadata, setBuktiMetadata] = useState<{ width: number; height: number; type: string }[]>([]);
    const [keterangan, setKeterangan] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Camera states
    const [showCamera, setShowCamera] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);

    const openCamera = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Izin Diperlukan', 'Izinkan akses kamera untuk mengambil foto bukti');
                return;
            }
        }
        setShowCamera(true);
    };

    const handleCapture = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: false,
            });

            if (photo?.uri) {
                setBuktiUrls(prev => [...prev, photo.uri]);
                setBuktiMetadata(prev => [...prev, {
                    width: photo.width,
                    height: photo.height,
                    type: 'camera'
                }]);
                setShowCamera(false);
            }
        } catch (error) {
            logger.error('Camera capture error:', error);
            Alert.alert('Error', 'Gagal mengambil foto');
        }
    };

    const handleGalleryPick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsMultipleSelection: true,
                selectionLimit: 5 - buktiUrls.length,
            });

            if (!result.canceled && result.assets.length > 0) {
                const newUris = result.assets.map(asset => asset.uri);
                const newMeta = result.assets.map(asset => ({
                    width: asset.width,
                    height: asset.height,
                    type: 'gallery'
                }));
                setBuktiUrls(prev => [...prev, ...newUris]);
                setBuktiMetadata(prev => [...prev, ...newMeta]);
            }
        } catch (error) {
            logger.error('Gallery pick error:', error);
            Alert.alert('Error', 'Gagal memilih foto');
        }
    };

    const removePhoto = (index: number) => {
        setBuktiUrls(prev => prev.filter((_, i) => i !== index));
        setBuktiMetadata(prev => prev.filter((_, i) => i !== index));
    };

    const [loadingProgress, setLoadingProgress] = useState(0);

    // ...

    const handleSubmit = async () => {
        if (buktiUrls.length === 0) {
            Alert.alert('Validasi', 'Minimal upload 1 foto bukti');
            return;
        }

        const validation = validateData(ClaimPointSchema, { keterangan: sanitizeInput(keterangan) });
        if (!validation.success) {
            Alert.alert('Data Tidak Valid', validation.error);
            return;
        }

        Alert.alert(
            'Konfirmasi Claim',
            'Setelah submit, data canvasing tidak bisa diubah lagi. Lanjutkan?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Submit',
                    onPress: async () => {
                        setIsSubmitting(true);
                        setShowLoading(true);
                        setLoadingProgress(0);
                        setLoadingMessage('Mengupload foto bukti...');

                        try {
                            // Upload all photos
                            const uploadedUrls = await uploadService.uploadBatch(
                                buktiUrls,
                                'marketing/point-claims',
                                (index, total, progress) => {
                                    setLoadingMessage(`Mengupload foto ${index}/${total}...`);
                                    setLoadingProgress(progress.percentage);
                                }
                            );

                            setLoadingMessage('Mengirim claim...');
                            setLoadingProgress(0); // Indeterminate for API call

                            // Submit claim
                            await api.post(
                                `/api/marketing/canvasing/${id}/claim`,
                                {
                                    buktiUrls: uploadedUrls,
                                    buktiMetadata,
                                    keterangan: validation.data.keterangan || null,
                                }
                            );

                            setShowLoading(false);
                            Alert.alert(
                                'Berhasil! 🎉',
                                'Claim poin berhasil diajukan. Tunggu approval dari admin.',
                                [{ text: 'OK', onPress: () => router.back() }]
                            );
                        } catch (error) {
                            setShowLoading(false);
                            const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
                            Alert.alert('Gagal', errorMessage);
                        } finally {
                            setIsSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    // Camera View
    if (showCamera) {
        return (
            <View style={tw`flex-1 bg-black`}>
                <CameraView
                    ref={cameraRef}
                    style={tw`flex-1`}
                    facing={cameraFacing}
                />
                <View style={tw`absolute inset-0 justify-end pb-10 pointer-events-none`}>
                    <View style={tw`flex-row justify-around items-center px-8`}>
                        <TouchableOpacity
                            onPress={() => setShowCamera(false)}
                            style={tw`w-14 h-14 bg-white/20 rounded-full items-center justify-center pointer-events-auto`}
                        >
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCapture}
                            style={tw`w-20 h-20 bg-white rounded-full items-center justify-center border-4 border-white/50 pointer-events-auto`}
                        >
                            <View style={tw`w-16 h-16 bg-white rounded-full`} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setCameraFacing(f => f === 'back' ? 'front' : 'back')}
                            style={tw`w-14 h-14 bg-white/20 rounded-full items-center justify-center pointer-events-auto`}
                        >
                            <Ionicons name="camera-reverse" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            <LoadingModal visible={showLoading} message={loadingMessage} progress={loadingProgress > 0 ? loadingProgress : undefined} />

            {/* Header */}
            <View style={tw`bg-indigo-700 pt-12 pb-6 px-5`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={tw`w-10 h-10 items-center justify-center bg-white/10 rounded-full`}
                    >
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-black text-white uppercase tracking-tighter`}>
                        Claim Poin
                    </Text>
                    <View style={tw`w-10`} />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}
            >
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`p-5 pb-32`}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info Card */}
                    <View style={tw`bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6`}>
                        <View style={tw`flex-row items-start`}>
                            <Ionicons name="information-circle" size={24} color="#d97706" style={tw`mr-3 mt-0.5`} />
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-amber-800 font-bold mb-1`}>Informasi Penting</Text>
                                <Text style={tw`text-amber-700 text-sm leading-5`}>
                                    Upload bukti foto untuk mendapatkan +2 poin. Setelah submit, data canvasing akan dikunci dan tidak bisa diubah.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Bukti Upload Section */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center mb-4`}>
                            <View style={tw`w-8 h-8 bg-indigo-100 rounded-xl items-center justify-center mr-3`}>
                                <Ionicons name="images" size={16} color="#4f46e5" />
                            </View>
                            <Text style={tw`text-base font-black text-gray-900`}>
                                Bukti Foto <Text style={tw`text-red-500`}>*</Text>
                            </Text>
                        </View>

                        {/* Photo Grid */}
                        <View style={tw`flex-row flex-wrap gap-3 mb-4`}>
                            {buktiUrls.map((uri, index) => (
                                <View key={index} style={tw`relative`}>
                                    <ImageWithCache source={uri} style={tw`w-24 h-24 rounded-xl`} contentFit="cover" transition={1000}  />
                                    <TouchableOpacity
                                        onPress={() => removePhoto(index)}
                                        style={tw`absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center shadow`}
                                    >
                                        <Ionicons name="close" size={14} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        {buktiUrls.length < 5 && (
                            <View style={tw`flex-row gap-3`}>
                                <TouchableOpacity
                                    onPress={openCamera}
                                    style={tw`flex-1 bg-white border-2 border-dashed border-indigo-300 rounded-2xl p-4 items-center`}
                                >
                                    <View style={tw`w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mb-2`}>
                                        <Ionicons name="camera" size={24} color="#4f46e5" />
                                    </View>
                                    <Text style={tw`text-indigo-600 font-bold text-sm`}>Kamera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleGalleryPick}
                                    style={tw`flex-1 bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 items-center`}
                                >
                                    <View style={tw`w-12 h-12 bg-gray-100 rounded-full items-center justify-center mb-2`}>
                                        <Ionicons name="images" size={24} color="#6b7280" />
                                    </View>
                                    <Text style={tw`text-gray-600 font-bold text-sm`}>Galeri</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={tw`text-xs text-gray-400 mt-2 text-center`}>
                            Maksimal 5 foto. Upload foto form pendaftaran, foto bersama pelanggan, atau bukti instalasi.
                        </Text>
                    </View>

                    {/* Keterangan */}
                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-center mb-4`}>
                            <View style={tw`w-8 h-8 bg-gray-100 rounded-xl items-center justify-center mr-3`}>
                                <Ionicons name="document-text" size={16} color="#6b7280" />
                            </View>
                            <Text style={tw`text-base font-black text-gray-900`}>Keterangan (Opsional)</Text>
                        </View>

                        <TextInput
                            value={keterangan}
                            onChangeText={setKeterangan}
                            placeholder="Tambahkan catatan jika diperlukan..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            numberOfLines={4}
                            style={tw`bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 min-h-[100px]`}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Submit Button */}
            <View style={tw`absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100`}>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting || buktiUrls.length === 0}
                    style={tw`bg-indigo-600 rounded-2xl p-4 flex-row items-center justify-center ${isSubmitting || buktiUrls.length === 0 ? 'opacity-50' : ''}`}
                >
                    <Ionicons name="gift" size={20} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white font-black text-base`}>
                        Submit Claim (+2 Poin)
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
