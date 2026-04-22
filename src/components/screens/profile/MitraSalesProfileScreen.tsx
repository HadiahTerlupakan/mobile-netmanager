import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { ProfileSkeleton } from '@/components/molecules/ProfileSkeleton';
import { UpdateAvailableModal } from "@/components/molecules/UpdateAvailableModal";
import { CURRENT_VERSION_CODE, CURRENT_VERSION_CODE_LABEL, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { useAppVersion } from "@/hooks/useAppVersion";
import { useProfileSync } from '@/hooks/useProfileSync';
import { TenantService } from '@/services/TenantService';
import { logger } from '@/utils/logger';
import { Href, router } from 'expo-router';
import { BadgeCheck, LogOut, Mail, MapPin, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

export function MitraSalesProfileScreen() {
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
        if (!Config.CAN_MANUALLY_CHECK_APP_UPDATES) {
            Alert.alert('Info', 'Cek update APK hanya tersedia pada build Android staging internal.');
            return;
        }

        if (Platform.OS === 'ios') {
            Alert.alert('Info', 'Cek update hanya tersedia untuk Android APK.');
            return;
        }

        try {
            const result = await checkForUpdate(CURRENT_VERSION_CODE);

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
        <SafeAreaView style={tw`flex-1 bg-slate-50`} edges={["top", "left", "right"]}>
            <ScrollView
                contentContainerStyle={tw`pb-32`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={tw`bg-slate-900 px-6 pt-6 pb-20 rounded-b-[40px] z-10`}>
                    <View style={tw`items-center`}>
                        {profileData?.image ? (
                            <ImageWithCache
                                source={getImageUrl(profileData.image)}
                                style={tw`w-28 h-28 rounded-full mb-4 border-4 border-slate-700`}
                                contentFit="cover"
                                transition={1000}
                            />
                        ) : (
                            <View style={tw`w-28 h-28 bg-white rounded-full items-center justify-center mb-4 shadow-lg border-4 border-slate-700`}>
                                <Text style={tw`text-slate-800 text-4xl font-black`}>{getInitials(displayName)}</Text>
                            </View>
                        )}
                        <Text style={tw`text-white font-black text-2xl tracking-tight mt-2`}>{displayName}</Text>
                        <Text style={tw`text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold`}>{displayEmail}</Text>
                        {profileData?.role?.name && (
                            <View style={tw`bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 rounded-full mt-3`}>
                                <Text style={tw`text-emerald-400 text-xs font-bold tracking-wider uppercase`}>{profileData.role.name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info Cards */}
                <View style={tw`px-4 -mt-10 z-20`}>
                    <View style={tw`bg-white rounded-[24px] shadow-sm border border-slate-100/80 overflow-hidden`}>
                        {/* Email */}
                        <View style={tw`flex-row items-center p-4 border-b border-slate-50`}>
                            <View style={tw`w-10 h-10 bg-emerald-50 rounded-2xl items-center justify-center mr-4 border border-emerald-100/50`}>
                                <Mail size={20} color="#059669" />
                            </View>
                            <View>
                                <Text style={tw`text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5`}>Email</Text>
                                <Text style={tw`text-slate-800 font-black tracking-tight`}>{displayEmail}</Text>
                            </View>
                        </View>


                        {/* Site */}
                        <View style={tw`flex-row items-center p-4`}>
                            <View style={tw`w-10 h-10 bg-blue-50 rounded-2xl items-center justify-center mr-4 border border-blue-100/50`}>
                                <MapPin size={20} color="#2563eb" />
                            </View>
                            <View>
                                <Text style={tw`text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5`}>Site / Lokasi</Text>
                                <Text style={tw`text-slate-800 font-black tracking-tight`}>{profileData?.sites?.name || 'Belum diatur'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* View ID Card Button */}
                    {profileData?.id && (
                        <TouchableOpacity
                            onPress={() => router.push(`/(app)/id-card/${profileData.id}` as Href)}
                            style={tw`mt-6 bg-purple-600 rounded-[20px] p-4 flex-row items-center justify-center shadow-sm`}
                        >
                            <BadgeCheck size={20} color="white" />
                            <Text style={tw`text-white font-black ml-2 tracking-widest text-xs uppercase`}>LIHAT ID CARD RESMI</Text>
                        </TouchableOpacity>
                    )}

                    {/* Privacy Policy Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/kebijakan-privasi' as Href)}
                        style={tw`mt-3 bg-white border border-slate-100/80 rounded-[20px] p-4 flex-row items-center justify-center shadow-sm`}
                    >
                        <ShieldCheck size={20} color="#64748b" />
                        <Text style={tw`text-slate-600 font-black ml-2 tracking-widest text-xs uppercase`}>Kebijakan Privasi</Text>
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                        style={tw`mt-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex-row items-center justify-center`}
                    >
                        {isLoggingOut ? (
                            <ActivityIndicator color="#e11d48" />
                        ) : (
                            <>
                                <LogOut size={20} color="#e11d48" />
                                <Text style={tw`text-rose-600 font-black ml-2 uppercase tracking-tight`}>Keluar</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* App Version - Manual Check */}
                    <TouchableOpacity
                        onPress={handleCheckUpdate}
                        disabled={isCheckingVersion}
                        style={tw`mt-8 items-center`}
                    >
                        {isCheckingVersion ? (
                            <ActivityIndicator size="small" color="#94a3b8" />
                        ) : (
                            <Text style={tw`text-center text-slate-400 text-[10px] font-bold tracking-widest uppercase`}>
                                RADPRO v{CURRENT_VERSION_NAME} (Build {CURRENT_VERSION_CODE_LABEL})
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

export default function MitraSalesProfile() {
    return (
        <ScreenErrorBoundary screenName="MitraSalesProfile">
            <MitraSalesProfileScreen />
        </ScreenErrorBoundary>
    );
}
