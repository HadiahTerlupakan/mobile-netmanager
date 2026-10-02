import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { KartuHeroGradien } from '@/components/molecules/KartuHeroGradien';
import { ProfileSkeleton } from '@/components/molecules/ProfileSkeleton';
import { getAppVersionLabel } from '@/constants/appVersion';
import { useAuth } from '@/context/AuthContext';
import { renderUpdateModal, useCheckUpdateButton } from '@/hooks/useCheckUpdateButton';
import { useProfileSync } from '@/hooks/useProfileSync';
import { DESAIN_PREMIUM, useTemaPersona } from '@/theme';
import { logger } from '@/utils/logger';
import { urlGambarTenant } from '@/utils/urlGambarTenant';
import { Href, router } from 'expo-router';
import { BadgeCheck, LogOut, Mail, MapPin, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const UKURAN_IKON = 18;
const WARNA_KELUAR = '#dc2626';

/** Profil mitra sales: kartu identitas bergradien, data akun, ID card, privasi, keluar. */
export function MitraSalesProfileScreen() {
    const { tw: twTema, warna } = useTemaPersona();
    const { user, signOut } = useAuth();
    const { profileData, isPending, refetch } = useProfileSync();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const updateCheck = useCheckUpdateButton();

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

    if (isPending && !profileData) {
        return <ProfileSkeleton />;
    }

    const displayName = profileData?.name || user?.name || 'User';
    const displayEmail = profileData?.email || user?.email || '-';

    const urlFoto = urlGambarTenant(profileData?.image);
    const baris: { ikon: LucideIcon; label: string; nilai: string }[] = [
        { ikon: Mail, label: 'Email', nilai: displayEmail },
        { ikon: MapPin, label: 'Site / lokasi', nilai: profileData?.sites?.name || 'Belum diatur' },
    ];

    return (
        <SafeAreaView style={[tw`flex-1`, { backgroundColor: DESAIN_PREMIUM.latarLayar }]} edges={['top', 'left', 'right']}>
            <ScrollView
                contentContainerStyle={tw`px-4 pb-32`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={warna.utamaKuat} />}
            >
                <Text style={tw`text-2xl font-bold text-slate-900 pt-4 pb-5`}>Profil</Text>

                <KartuHeroGradien>
                    <View style={tw`flex-row items-center`}>
                        {urlFoto ? (
                            <Image source={{ uri: urlFoto }} style={tw`w-16 h-16 rounded-full`} contentFit="cover" cachePolicy="memory-disk" />
                        ) : (
                            <View style={tw`w-16 h-16 rounded-full bg-white/15 border border-white/30 items-center justify-center`}>
                                <Text style={tw`text-2xl font-bold text-white`}>{displayName.charAt(0).toUpperCase() || 'M'}</Text>
                            </View>
                        )}
                        <View style={tw`flex-1 ml-4`}>
                            <Text style={tw`text-xl font-bold text-white`} numberOfLines={1}>{displayName}</Text>
                            <Text style={[tw`text-sm mt-0.5`, { color: warna.utamaGaris }]} numberOfLines={1}>
                                Mitra sales
                            </Text>
                        </View>
                    </View>
                </KartuHeroGradien>

                <View style={tw`bg-white rounded-2xl px-4 mt-5 border border-slate-200/70`}>
                    {baris.map(({ ikon: Ikon, label, nilai }, indeks) => (
                        <View key={label} style={tw`flex-row items-center py-3.5 ${indeks < baris.length - 1 ? 'border-b border-slate-100' : ''}`}>
                            <View style={twTema`w-9 h-9 rounded-lg bg-utama-sangat-muda items-center justify-center mr-3`}>
                                <Ikon size={UKURAN_IKON} color={warna.utamaKuat} />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-xs text-slate-500`}>{label}</Text>
                                <Text style={tw`text-sm font-semibold text-slate-900 mt-0.5`}>{nilai}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {profileData?.id && (
                    <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => router.push(`/(app)/id-card/${profileData.id}` as Href)}
                        style={[tw`mt-6 rounded-2xl py-4 flex-row items-center justify-center`, { backgroundColor: warna.utamaKuat }]}
                    >
                        <BadgeCheck size={UKURAN_IKON} color="white" />
                        <Text style={tw`text-white font-semibold ml-2`}>Lihat ID card resmi</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => router.push('/kebijakan-privasi' as Href)}
                    style={tw`mt-3 bg-white border border-slate-200/70 rounded-2xl py-4 flex-row items-center justify-center`}
                >
                    <ShieldCheck size={UKURAN_IKON} color={DESAIN_PREMIUM.ikonNetral} />
                    <Text style={tw`text-slate-700 font-semibold ml-2`}>Kebijakan privasi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Keluar"
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    style={tw`mt-3 bg-white border border-red-100 rounded-2xl py-4 flex-row items-center justify-center`}
                >
                    {isLoggingOut ? (
                        <ActivityIndicator color={WARNA_KELUAR} />
                    ) : (
                        <>
                            <LogOut size={UKURAN_IKON} color={WARNA_KELUAR} />
                            <Text style={tw`text-red-600 font-semibold ml-2`}>Keluar</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={updateCheck.handleCheckUpdate} disabled={updateCheck.isChecking} style={tw`mt-8 items-center`}>
                    {updateCheck.isChecking ? (
                        <ActivityIndicator size="small" color={DESAIN_PREMIUM.ikonNetral} />
                    ) : (
                        <Text style={tw`text-center text-slate-400 text-xs`}>
                            {getAppVersionLabel()}
                            {'\n'}Ketuk untuk cek update
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {renderUpdateModal(updateCheck)}
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
