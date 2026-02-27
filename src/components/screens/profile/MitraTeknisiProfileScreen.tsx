import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { ProfileSkeleton } from '@/components/molecules/ProfileSkeleton';
import { UpdateAvailableModal } from "@/components/molecules/UpdateAvailableModal";
import { useAuth } from '@/context/AuthContext';
import { useAppVersion } from "@/hooks/useAppVersion";
import { useProfileSync } from '@/hooks/useProfileSync';
import { TenantService } from '@/services/TenantService';
import { logger } from '@/utils/logger';
import Constants from 'expo-constants';
import { Href, router } from 'expo-router';
import { Edit3, LogOut, Mail, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

export function MitraTeknisiProfileScreen() {
    const { user, signOut } = useAuth();
    const { profileData, isPending, refetch } = useProfileSync();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const {
        isChecking: isCheckingVersion,
        downloadStatus,
        downloadProgress,
        latestVersion,
        error: versionError,
        checkForUpdate,
        startUpdate,
        dismissError,
    } = useAppVersion();

    const handleCheckUpdate = async () => {
        if (Platform.OS === 'ios') {
            Alert.alert('Info', 'Cek update hanya tersedia untuk Android APK.');
            return;
        }

        const currentVersionCode = Constants.expoConfig?.extra?.versionCode || 53;

        try {
            const result = await checkForUpdate(currentVersionCode);

            if (result.success && result.updateAvailable) {
                setShowUpdateModal(true);
            } else if (result.success && !result.updateAvailable) {
                Alert.alert('Info', 'Aplikasi Anda sudah versi terbaru.');
            }
        } catch (error) {
            logger.error('Manual update check failed:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleLogout = () => {
        Alert.alert(
            'Konfirmasi Logout',
            'Apakah Anda yakin ingin keluar?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Keluar',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoggingOut(true);
                        try {
                            await signOut();
                        } catch (error) {
                            logger.error('Logout error', error);
                        } finally {
                            setIsLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;

        if (imagePath.includes('http')) return path;

        return `${baseUrl}${imagePath}`;
    };

    if (isPending && !profileData) {
        return <ProfileSkeleton />;
    }

    const displayName = profileData?.name || user?.name || 'User';
    const displayEmail = profileData?.email || user?.email || '-';

    return (
        <SafeAreaView style={tw`flex-1 bg-stone-100/50`}>
            <ScrollView
                contentContainerStyle={tw`pb-20`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={tw`bg-amber-500 px-6 pt-6 pb-16 rounded-b-[32px]`}>
                    <View style={tw`items-center`}>
                        {profileData?.image ? (
                            <ImageWithCache
                                source={getImageUrl(profileData.image)}
                                style={tw`w-24 h-24 rounded-2xl mb-4 border-4 border-white shadow-sm`}
                                contentFit="cover"
                                transition={1000}
                            />
                        ) : (
                            <View style={tw`w-24 h-24 bg-white rounded-2xl items-center justify-center mb-4 shadow-sm`}>
                                <Text style={tw`text-amber-500 text-4xl font-black`}>{getInitials(displayName)}</Text>
                            </View>
                        )}
                        <Text style={tw`text-white font-black tracking-tight text-2xl`}>{displayName}</Text>
                        <Text style={tw`text-amber-100 font-bold uppercase tracking-widest text-xs mt-1`}>{displayEmail}</Text>
                        {profileData?.role?.name && (
                            <View style={tw`bg-black/20 px-4 py-1.5 rounded-xl mt-3`}>
                                <Text style={tw`text-amber-50 text-xs font-black tracking-widest uppercase`}>{profileData.role.name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info Cards */}
                <View style={tw`px-4 -mt-8`}>
                    <View style={tw`bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden`}>
                        {/* Email */}
                        <View style={tw`flex-row items-center p-4 border-b border-stone-100`}>
                            <View style={tw`w-10 h-10 bg-stone-100 rounded-xl items-center justify-center mr-4`}>
                                <Mail size={20} color="#44403c" />
                            </View>
                            <View>
                                <Text style={tw`text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-0.5`}>Email</Text>
                                <Text style={tw`text-stone-800 font-bold`}>{displayEmail}</Text>
                            </View>
                        </View>


                        {/* Site */}
                        <View style={tw`flex-row items-center p-4`}>
                            <View style={tw`w-10 h-10 bg-stone-100 rounded-xl items-center justify-center mr-4`}>
                                <MapPin size={20} color="#44403c" />
                            </View>
                            <View>
                                <Text style={tw`text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-0.5`}>Site / Lokasi</Text>
                                <Text style={tw`text-stone-800 font-bold`}>{profileData?.sites?.name || 'Belum diatur'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Edit Profile Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/(app)/edit-profile' as Href)}
                        style={tw`mt-6 bg-stone-800 rounded-xl p-4 flex-row items-center justify-center`}
                    >
                        <Edit3 size={20} color="white" />
                        <Text style={tw`text-white font-black ml-2 uppercase tracking-widest text-xs`}>Edit Profil & Password</Text>
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                        style={tw`mt-3 bg-white border border-rose-200 rounded-xl p-4 flex-row items-center justify-center`}
                    >
                        {isLoggingOut ? (
                            <ActivityIndicator color="#e11d48" />
                        ) : (
                            <>
                                <LogOut size={20} color="#e11d48" />
                                <Text style={tw`text-rose-600 font-black ml-2 uppercase tracking-widest text-xs`}>Keluar</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* App Version - Manual Check */}
                    <TouchableOpacity
                        onPress={handleCheckUpdate}
                        disabled={isCheckingVersion}
                        style={tw`mt-6 items-center`}
                    >
                        {isCheckingVersion ? (
                            <ActivityIndicator size="small" color="#a8a29e" />
                        ) : (
                            <Text style={tw`text-center text-stone-400 text-[10px] font-bold uppercase tracking-widest`}>
                                NetManager Mobile v{Constants.expoConfig?.version || '1.0.0'} (Build {Constants.expoConfig?.extra?.versionCode || '1'})
                                {'\n'}Ketuk untuk cek update
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Update Modal */}
            {showUpdateModal && latestVersion && (
                <UpdateAvailableModal
                    visible={showUpdateModal}
                    latestVersion={latestVersion}
                    downloadStatus={downloadStatus}
                    downloadProgress={downloadProgress}
                    error={versionError}
                    onStartUpdate={startUpdate}
                    onLater={() => setShowUpdateModal(false)}
                    onDismissError={dismissError}
                />
            )}
        </SafeAreaView>
    );
}

export default function MitraTeknisiProfile() {
    return (
        <ScreenErrorBoundary screenName="MitraTeknisiProfile">
            <MitraTeknisiProfileScreen />
        </ScreenErrorBoundary>
    );
}
