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
import { Briefcase, Building2, Calendar, Clock, Edit3, LogOut, Mail, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

export function KaryawanProfileScreen() {
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

    const formatWorkDays = (days?: string | null) => {
        if (!days) return 'Sen - Jum';
        const dayMap: Record<string, string> = {
            'Mon': 'Sen', 'Tue': 'Sel', 'Wed': 'Rab',
            'Thu': 'Kam', 'Fri': 'Jum', 'Sat': 'Sab', 'Sun': 'Min'
        };
        return days.split(',').map(d => dayMap[d.trim()] || d).join(', ');
    };

    if (isPending && !profileData) {
        return <ProfileSkeleton />;
    }

    const displayName = profileData?.name || user?.name || 'User';
    const displayEmail = profileData?.email || user?.email || '-';

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <ScrollView
                contentContainerStyle={tw`pb-20`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={tw`bg-blue-600 px-6 pt-6 pb-16 rounded-b-[40px]`}>
                    <View style={tw`items-center`}>
                        {profileData?.image ? (
                            <ImageWithCache
                                source={getImageUrl(profileData.image)}
                                style={tw`w-24 h-24 rounded-full mb-4 border-4 border-white`}
                                contentFit="cover"
                                transition={1000}
                            />
                        ) : (
                            <View style={tw`w-24 h-24 bg-white rounded-full items-center justify-center mb-4 shadow-lg`}>
                                <Text style={tw`text-blue-600 text-4xl font-bold`}>{getInitials(displayName)}</Text>
                            </View>
                        )}
                        <Text style={tw`text-white font-bold text-2xl`}>{displayName}</Text>
                        <Text style={tw`text-blue-100 text-sm mt-1`}>{displayEmail}</Text>
                        {profileData?.role?.name && (
                            <View style={tw`bg-blue-500 px-3 py-1 rounded-full mt-2`}>
                                <Text style={tw`text-white text-xs font-medium`}>{profileData.role.name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info Cards */}
                <View style={tw`px-4 -mt-8`}>
                    <View style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
                        {/* Email */}
                        <View style={tw`flex-row items-center p-4 border-b border-gray-100`}>
                            <View style={tw`w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-4`}>
                                <Mail size={20} color="#2563eb" />
                            </View>
                            <View>
                                <Text style={tw`text-xs text-gray-400 font-medium`}>Email</Text>
                                <Text style={tw`text-gray-800 font-semibold`}>{displayEmail}</Text>
                            </View>
                        </View>

                        {/* Department */}
                        <View style={tw`flex-row items-center p-4 border-b border-gray-100`}>
                            <View style={tw`w-10 h-10 bg-purple-50 rounded-full items-center justify-center mr-4`}>
                                <Building2 size={20} color="#7c3aed" />
                            </View>
                            <View>
                                <Text style={tw`text-xs text-gray-400 font-medium`}>Department</Text>
                                <Text style={tw`text-gray-800 font-semibold`}>{profileData?.departments?.name || 'Belum diatur'}</Text>
                            </View>
                        </View>

                        {/* Site */}
                        <View style={tw`flex-row items-center p-4 border-b border-gray-100`}>
                            <View style={tw`w-10 h-10 bg-green-50 rounded-full items-center justify-center mr-4`}>
                                <MapPin size={20} color="#16a34a" />
                            </View>
                            <View>
                                <Text style={tw`text-xs text-gray-400 font-medium`}>Site / Lokasi</Text>
                                <Text style={tw`text-gray-800 font-semibold`}>{profileData?.sites?.name || 'Belum diatur'}</Text>
                            </View>
                        </View>

                        {/* Work Schedule */}
                        <View style={tw`p-4`}>
                            <View style={tw`flex-row items-center mb-3`}>
                                <View style={tw`w-10 h-10 bg-amber-50 rounded-full items-center justify-center mr-4`}>
                                    <Clock size={20} color="#d97706" />
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-xs text-gray-400 font-medium`}>Jam Kerja</Text>
                                    <View style={tw`flex-row items-center`}>
                                        <Text style={tw`text-gray-800 font-semibold`}>
                                            {profileData?.workingHourMode === 'FLEXIBLE' ? 'Fleksibel' : 'Fixed'}
                                        </Text>
                                        <View style={tw`bg-blue-100 px-2 py-0.5 rounded-full ml-2`}>
                                            <Text style={tw`text-blue-700 text-xs font-medium`}>
                                                {profileData?.workingHourMode || 'FIXED'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {profileData?.workingHourMode !== 'FLEXIBLE' && (
                                <View style={tw`bg-gray-50 rounded-xl p-3 ml-14`}>
                                    <View style={tw`flex-row items-center mb-1`}>
                                        <Briefcase size={14} color="#6b7280" />
                                        <Text style={tw`text-gray-600 text-sm ml-2`}>
                                            {profileData?.startWorkTime || '09:00'} - {profileData?.endWorkTime || '17:00'}
                                        </Text>
                                    </View>
                                    <View style={tw`flex-row items-center`}>
                                        <Calendar size={14} color="#6b7280" />
                                        <Text style={tw`text-gray-500 text-xs ml-2`}>
                                            {formatWorkDays(profileData?.workDays)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Edit Profile Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/(app)/edit-profile' as Href)}
                        style={tw`mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-center justify-center`}
                    >
                        <Edit3 size={20} color="#2563eb" />
                        <Text style={tw`text-blue-600 font-bold ml-2`}>Edit Profil & Password</Text>
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                        style={tw`mt-3 bg-red-50 border border-red-100 rounded-2xl p-4 flex-row items-center justify-center`}
                    >
                        {isLoggingOut ? (
                            <ActivityIndicator color="#dc2626" />
                        ) : (
                            <>
                                <LogOut size={20} color="#dc2626" />
                                <Text style={tw`text-red-600 font-bold ml-2`}>Keluar</Text>
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
                            <ActivityIndicator size="small" color="#9ca3af" />
                        ) : (
                            <Text style={tw`text-center text-gray-400 text-xs`}>
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

export default function KaryawanProfile() {
    return (
        <ScreenErrorBoundary screenName="KaryawanProfile">
            <KaryawanProfileScreen />
        </ScreenErrorBoundary>
    );
}
