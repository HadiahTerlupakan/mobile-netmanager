import { FormInput } from '@/components/atoms/FormInput';
import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { FormSkeleton } from '@/components/molecules/FormSkeleton';
import LoadingModal from '@/components/molecules/LoadingModal';
import { useApiMutation, useQueryClient } from '@/hooks/queries';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import { useProfileSync } from '@/hooks/useProfileSync';
import { queryKeys } from '@/lib/queryClient';
import { TenantService } from '@/services/TenantService';
import { uploadService } from '@/services/UploadService';
import { getUserFriendlyError } from '@/utils/errorHandling';
import { ProfileSchema } from '@/utils/validation';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft, Camera, ChevronRight, Lock, Phone, Save, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { z } from 'zod';

type ProfileFormData = z.infer<typeof ProfileSchema>;

function EditProfileScreen() {
    const { profileData, isPending } = useProfileSync();
    const queryClient = useQueryClient();
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const {
        control,
        handleValidatedSubmit,
        formState: { errors },
        reset
    } = useFormWithValidation({
        schema: ProfileSchema,
        defaultValues: {
            name: '',
            phone: ''
        }
    });

    useEffect(() => {
        if (profileData) {
            reset({
                name: profileData.name || '',
                phone: (profileData as any).phone || ''
            });
        }
    }, [profileData, reset]);

    const saveMutation = useApiMutation({
        endpoint: '/api/mobile/profile',
        method: 'PATCH',
        invalidateKeys: [queryKeys.profile.detail()],
        successMessage: 'Profil berhasil diperbarui',
        onSuccess: () => {
            router.back();
        }
    });

    const handleSave = handleValidatedSubmit((data: ProfileFormData) => {
        saveMutation.mutate(data);
    });

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Izin Diperlukan', 'Izinkan akses ke galeri untuk memilih foto');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            uploadPhoto(result.assets[0].uri, result.assets[0].mimeType);
        }
    };

    const uploadPhoto = async (uri: string, mimeType?: string) => {
        setUploadingPhoto(true);
        setUploadProgress(0);
        try {
            const res = await uploadService.uploadCustom(uri, '/api/mobile/profile/photo', {
                fieldName: 'photo',
                mimeType: mimeType || 'image/jpeg',
                onProgress: (progress) => {
                    setUploadProgress(progress.percentage);
                }
            });

            if (res.success) {
                Alert.alert('Sukses', 'Foto berhasil diperbarui');
                queryClient.invalidateQueries({ queryKey: queryKeys.profile.detail() });
            }
        } catch (error) {
            const { title, message } = getUserFriendlyError(error);
            Alert.alert(title, message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;

        return `${baseUrl}${imagePath}`;
    };

    if (isPending && !profileData) {
        return <FormSkeleton />;
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-200`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2`}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`flex-1 text-lg font-bold text-gray-800 ml-2`}>Edit Profil</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
                <LoadingModal visible={uploadingPhoto} message="Mengupload foto..." progress={uploadProgress > 0 ? uploadProgress : undefined} />

                {/* Photo Section */}
                <View style={tw`items-center mb-6`}>
                    <View style={tw`relative`}>
                        {profileData?.image ? (
                            <ImageWithCache
                                source={getImageUrl(profileData.image)}
                                style={tw`w-28 h-28 rounded-full`}
                                contentFit="cover"
                                transition={1000}
                            />
                        ) : (
                            <View style={tw`w-28 h-28 rounded-full bg-blue-100 items-center justify-center`}>
                                <Text style={tw`text-blue-600 text-4xl font-bold`}>
                                    {getInitials(profileData?.name)}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={pickImage}
                            disabled={uploadingPhoto}
                            style={tw`absolute bottom-0 right-0 bg-blue-600 rounded-full p-3 shadow-lg`}
                        >
                            <Camera size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={tw`text-gray-500 text-sm mt-2`}>Ketuk untuk mengubah foto</Text>
                </View>

                {/* Profile Form */}
                <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
                    <Text style={tw`text-base font-bold text-gray-800 mb-4`}>Informasi Profil</Text>

                    {/* Name */}
                    <View style={tw`mb-4`}>
                        <FormInput
                            name="name"
                            control={control}
                            label="Nama"
                            placeholder="Masukkan nama"
                            leftIcon={<User size={20} color="#6b7280" />}
                            error={errors.name?.message}
                        />
                    </View>

                    {/* Phone */}
                    <View style={tw`mb-4`}>
                        <FormInput
                            name="phone"
                            control={control}
                            label="Nomor Telepon"
                            placeholder="Masukkan nomor telepon"
                            keyboardType="phone-pad"
                            leftIcon={<Phone size={20} color="#6b7280" />}
                            error={errors.phone?.message}
                        />
                    </View>

                    {/* Email (read-only) */}
                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Email</Text>
                        <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3 bg-gray-50`}>
                            <TextInput
                                value={profileData?.email || ''}
                                editable={false}
                                style={tw`flex-1 py-3 px-3 text-gray-500`}
                            />
                        </View>
                        <Text style={tw`text-xs text-gray-400 mt-1`}>Email tidak dapat diubah</Text>
                    </View>
                </View>

                {/* Change Password Link */}
                <TouchableOpacity
                    onPress={() => router.push('/(app)/change-password')}
                    style={tw`bg-white rounded-xl p-4 shadow-sm mb-4 flex-row items-center justify-between`}
                >
                    <View style={tw`flex-row items-center`}>
                        <Lock size={20} color="#6b7280" />
                        <Text style={tw`text-base font-bold text-gray-800 ml-3`}>Ganti Password</Text>
                    </View>
                    <ChevronRight size={20} color="#6b7280" />
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saveMutation.isPending}
                    style={tw`bg-blue-600 rounded-xl py-4 flex-row items-center justify-center ${saveMutation.isPending ? 'opacity-50' : ''}`}
                >
                    {saveMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Save size={20} color="#fff" />
                            <Text style={tw`text-white font-bold ml-2`}>Simpan Profil</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

export default function EditProfile() {
    return (
        <ScreenErrorBoundary screenName="EditProfile">
            <EditProfileScreen />
        </ScreenErrorBoundary>
    );
}
