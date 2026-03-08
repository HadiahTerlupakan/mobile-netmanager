import { useAuth } from '@/context/AuthContext';
import { queryClient, queryKeys } from '@/lib/queryClient';
import api from '@/services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AlertCircle, Camera as CameraIcon, CheckCircle, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface FaceVerificationModalProps {
    visible: boolean;
    onVerificationComplete: () => void;
}

export function FaceVerificationModal({ visible, onVerificationComplete }: FaceVerificationModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const { user, updateUser } = useAuth();

    const { width } = Dimensions.get('window');
    // Create a square frame for the selfie
    const frameSize = width * 0.75;

    useEffect(() => {
        if (visible && !permission) {
            requestPermission();
        }
    }, [visible, permission, requestPermission]);

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: false,
                });
                setPhotoUri(photo.uri);
            } catch {
                Alert.alert('Error', 'Gagal mengambil gambar. Silakan coba lagi.');
            }
        }
    };

    const retakePicture = () => {
        setPhotoUri(null);
    };

    const submitVerification = async () => {
        if (!photoUri) return;

        setIsProcessing(true);
        try {
            const formData = new FormData();

            // Determine correct mime type based on extension
            let mimeType = 'image/jpeg';
            let extension = 'jpg';
            if (photoUri.toLowerCase().endsWith('.png')) {
                mimeType = 'image/png';
                extension = 'png';
            }

            formData.append('photo', {
                uri: photoUri,
                name: `verification_${Date.now()}.${extension}`,
                type: mimeType,
            } as any);

            // Verify Liveness Endpoint
            const response = await api.post('/api/mobile/mitra/verify-face', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const newPhotoUrl = response.data?.data?.url;

            Alert.alert(
                'Verifikasi Berhasil',
                'Wajah Anda telah berhasil diverifikasi.',
                [{
                    text: 'Lanjut Bekerja', onPress: () => {
                        // Wipe React Query Cache instantly so useProfileSync doesn't resurrect it
                        queryClient.setQueryData(queryKeys.profile.detail(), (oldData: any) => {
                            if (!oldData) return oldData;
                            const innerData = oldData.data || oldData;
                            return {
                                ...oldData,
                                data: {
                                    ...innerData,
                                    requiresFaceVerification: false,
                                    fotoDiri: newPhotoUrl || innerData.fotoDiri,
                                    image: newPhotoUrl || innerData.image
                                }
                            };
                        });

                        // trigger background truth refresh
                        queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail() });

                        // Turn off flag locally so modal disappears immediately
                        if (user) {
                            updateUser({
                                ...user,
                                requiresFaceVerification: false,
                                image: newPhotoUrl || user.image
                            });
                        }
                        onVerificationComplete();
                    }
                }]
            );
        } catch (error: any) {
            console.error('Face verification error:', error);
            Alert.alert(
                'Verifikasi Gagal',
                error.response?.data?.message || 'Gagal memverifikasi wajah. Pastikan foto jelas dan terang.'
            );
            setPhotoUri(null); // Force retake
        } finally {
            setIsProcessing(false);
        }
    };

    if (!permission) {
        return null; // Awaiting permissions
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={tw`flex-1 bg-gray-900`}>
                <View style={tw`flex-1 p-6`}>

                    <View style={tw`items-center mb-8 mt-4`}>
                        <AlertCircle color="#f59e0b" size={48} style={tw`mb-4`} />
                        <Text style={tw`text-xl font-bold text-white text-center mb-2`}>
                            Verifikasi Wajah Diperlukan
                        </Text>
                        <Text style={tw`text-gray-300 text-center text-sm px-4`}>
                            Demi keamanan bersama, sistem mendeteksi bahwa sesi Anda wajib melakukan absensi wajah pada jam ini.
                        </Text>
                    </View>

                    <View style={tw`flex-1 items-center justify-center`}>
                        {!permission.granted ? (
                            <View style={tw`items-center p-6 bg-gray-800 rounded-xl`}>
                                <AlertCircle color="#ef4444" size={40} style={tw`mb-4`} />
                                <Text style={tw`text-red-400 text-center mb-4`}>Akses Kamera Ditolak</Text>
                                <Text style={tw`text-gray-400 text-center text-sm mb-4`}>
                                    Kami tidak bisa melanjutkan tanpa akses kamera.
                                </Text>
                                <TouchableOpacity onPress={requestPermission} style={tw`bg-blue-600 px-6 py-2 rounded-lg`}>
                                    <Text style={tw`text-white font-bold`}>Izinkan Kamera</Text>
                                </TouchableOpacity>
                            </View>
                        ) : photoUri ? (
                            <View style={[tw`rounded-full overflow-hidden border-4 border-blue-500`, { width: frameSize, height: frameSize }]}>
                                <View style={tw`flex-1 bg-gray-800`} />
                                {/* Image preview would go here, simulated for now */}
                                <Text style={tw`absolute items-center justify-center text-white h-full w-full text-center p-32`}>✓</Text>
                            </View>
                        ) : (
                            <View style={[tw`rounded-full overflow-hidden border-4 border-gray-600`, { width: frameSize, height: frameSize }]}>
                                <CameraView
                                    ref={cameraRef}
                                    style={tw`flex-1`}
                                    facing="front"
                                />
                            </View>
                        )}

                        {!photoUri && permission.granted && (
                            <Text style={tw`text-gray-400 text-xs mt-6 text-center`}>
                                Posisikan wajah Anda pada lingkaran lalu tekan tombol di bawah.
                            </Text>
                        )}
                    </View>

                    <View style={tw`mt-auto pt-6`}>
                        {photoUri ? (
                            <View style={tw`flex-row gap-4`}>
                                <TouchableOpacity
                                    style={tw`flex-1 bg-gray-800 py-4 rounded-xl items-center flex-row justify-center`}
                                    onPress={retakePicture}
                                    disabled={isProcessing}
                                >
                                    <RefreshCw color="#d1d5db" size={20} style={tw`mr-2`} />
                                    <Text style={tw`text-gray-300 font-bold`}>Ulangi</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={tw`flex-1 bg-blue-600 py-4 rounded-xl items-center flex-row justify-center`}
                                    onPress={submitVerification}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <CheckCircle color="white" size={20} style={tw`mr-2`} />
                                            <Text style={tw`text-white font-bold`}>Kirim</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={tw`bg-blue-600 py-4 rounded-full items-center justify-center w-20 h-20 self-center shadow-lg`}
                                onPress={takePicture}
                                disabled={!permission.granted}
                            >
                                <CameraIcon color="white" size={32} />
                            </TouchableOpacity>
                        )}
                    </View>

                </View>
            </SafeAreaView>
        </Modal>
    );
}
