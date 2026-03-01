import { useAuth } from '@/context/AuthContext';
import { useProfileSync } from '@/hooks/useProfileSync';
import { TenantService } from '@/services/TenantService';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ChevronLeft, Download, Share2 } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import tw from 'twrnc';

export default function NativeIDCardScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // The profile sync hook will grab our newly added nik, fotoDiri, createdAt from API via useOfflineQuery
    const { profileData: profile } = useProfileSync() as unknown as { profileData: any };

    const viewShotRef = useRef<ViewShot>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Scale the ID Card up to fill screen while preserving 85.6 : 53.98 proportion
    const screenWidth = Dimensions.get('window').width;
    // Base dimensions we used on web (323.5 x 204)
    const cardWidth = 323.5;
    const cardHeight = 204;

    // Scale up to almost touch screen edges (leaving 20px padding on left/right)
    // Since we will rotate the card 90 degrees, its horizontal width is `cardHeight`. 
    // We scale it so `cardHeight * targetScale = screenWidth - 40`
    const targetScale = Math.min((screenWidth - 40) / cardHeight, 1.8);
    const boundingWidth = cardHeight * targetScale;
    const boundingHeight = cardWidth * targetScale;

    const isSales = profile?.mitraType === 'MITRA_SALES';
    const verifyUrl = `https://radpro.id/mitra-id/${profile?.id || user?.id}`;

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).toUpperCase();
    };

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${imagePath}`;
    };

    const handleDownload = async () => {
        try {
            setIsSaving(true);
            const status = await MediaLibrary.requestPermissionsAsync();
            if (status.status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin untuk menyimpan gambar ke Galeri.');
                return;
            }

            if (viewShotRef.current?.capture) {
                const uri = await viewShotRef.current.capture();
                await MediaLibrary.saveToLibraryAsync(uri);
                Alert.alert('Berhasil', 'ID Card berhasil disimpan ke Galeri HP Anda!');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Gagal menyimpan ID Card.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async () => {
        try {
            setIsSaving(true);
            if (viewShotRef.current?.capture) {
                const uri = await viewShotRef.current.capture();
                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(uri, { dialogTitle: 'Share ID Card' });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!profile) {
        return (
            <View style={tw`flex-1 bg-white items-center justify-center`}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-slate-50`} edges={['top', 'bottom', 'left', 'right']}>
            <View style={tw`flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100 z-10`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`w-10 h-10 items-center justify-center -ml-2`}>
                    <ChevronLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={tw`text-base font-black text-slate-900 tracking-tight`}>ID Card Resmi</Text>
                <View style={tw`w-10 h-10`} />
            </View>

            <ScrollView contentContainerStyle={tw`flex-grow items-center justify-center py-8 px-5`}>
                {/* Fixed size container for the rotated item so it doesn't clip */}
                <View style={{ width: boundingWidth, height: boundingHeight, alignItems: 'center', justifyContent: 'center' }}>
                    {/* Visual Scale Container wrapper */}
                    <View style={{ transform: [{ rotate: '90deg' }, { scale: targetScale }] }}>
                        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>

                            {/* THE ID CARD ITSELF (323.5px width) */}
                            <View style={[
                                tw`bg-white rounded-[12px] overflow-hidden bg-white`,
                                { width: cardWidth, height: cardHeight, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 }
                            ]}>
                                {/* Header Stripe */}
                                <View style={[
                                    tw`w-full flex-row items-center justify-between px-4 h-[45px]`,
                                    isSales ? tw`bg-purple-600` : tw`bg-indigo-600`
                                ]}>
                                    <View>
                                        <Text style={tw`text-white font-black tracking-widest text-[11px]`}>
                                            <Text style={tw`text-white text-[10px]`}>▶ </Text>NETMANAGER
                                        </Text>
                                        <Text style={tw`text-white opacity-80 text-[6px] tracking-[0.1em] font-medium mt-[1px]`}>BROADBAND & IT SOLUTIONS</Text>
                                    </View>
                                    <View style={tw`items-end`}>
                                        <Text style={tw`text-white opacity-80 text-[6px] font-bold tracking-[0.1em] text-right mb-[1px]`}>KARTU IDENTITAS</Text>
                                        <View style={tw`bg-white/20 px-2.5 py-[3px] rounded-full`}>
                                            <Text style={tw`text-white text-[7px] font-black tracking-widest`}>MITRA RESMI</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Card Body */}
                                <View style={tw`flex-1 flex-row p-4 pl-5 relative overflow-hidden bg-white`}>
                                    {/* Abstract Graphic Background */}
                                    <View style={[tw`absolute right-[-40px] bottom-[-20px] w-[200px] h-[200px] rounded-full bg-slate-50 opacity-80`, { transform: [{ scale: 1.1 }] }]} />
                                    <View style={[tw`absolute right-[60px] top-[10px] w-0 h-0`, {
                                        borderStyle: 'solid', borderLeftWidth: 15, borderRightWidth: 15, borderBottomWidth: 30,
                                        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#f8fafc',
                                        transform: [{ rotate: '45deg' }]
                                    }]} />

                                    {/* Avatar/Photo Column */}
                                    <View style={tw`mr-4 z-10 justify-center`}>
                                        <View style={tw`w-[70px] h-[85px] bg-slate-100 rounded border border-slate-200 justify-center items-center overflow-hidden`}>
                                            {getImageUrl(profile.fotoDiri) ? (
                                                <Image source={{ uri: getImageUrl(profile.fotoDiri)! }} style={tw`w-full h-full`} resizeMode="cover" />
                                            ) : (
                                                <View style={tw`items-center justify-center opacity-30`}>
                                                    <View style={tw`w-8 h-8 rounded-full bg-slate-400 mb-1`} />
                                                    <View style={tw`w-12 h-10 rounded-t-full bg-slate-400`} />
                                                    <Text style={tw`absolute text-slate-500 font-bold text-[6px] tracking-widest z-10 mt-6`}>NON FOTO</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Identity Data Column */}
                                    <View style={tw`flex-1 justify-center z-10 pt-1`}>
                                        <Text style={tw`font-black text-[13px] text-slate-900 uppercase tracking-tight leading-tight`} numberOfLines={1}>
                                            {profile.name || 'MITRA NETMANAGER'}
                                        </Text>
                                        <Text style={[tw`font-bold text-[8px] tracking-widest mt-0.5`, isSales ? tw`text-purple-600` : tw`text-indigo-600`]}>
                                            {isSales ? 'SALES REPRESENTATIVE' : 'FIELD TECHNICIAN'}
                                        </Text>

                                        <View style={tw`mt-3 space-y-1.5`}>
                                            <View>
                                                <Text style={tw`text-slate-400 text-[6px] font-bold tracking-widest`}>MITRA ID</Text>
                                                <Text style={tw`text-slate-800 text-[8px] font-bold tracking-wider mt-0.5 uppercase`}>{profile.id?.substring(0, 10)}</Text>
                                            </View>
                                            <View>
                                                <Text style={tw`text-slate-400 text-[6px] font-bold tracking-widest`}>BRANCH / SITE</Text>
                                                <Text style={tw`text-slate-800 text-[8px] font-bold tracking-wider mt-0.5 uppercase`}>{profile.sites?.name || 'Headquarters'}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* QR Code Area */}
                                    <View style={tw`absolute right-4 bottom-7 items-center z-10`}>
                                        <View style={tw`bg-white p-1 rounded-md shadow-sm border border-slate-100`}>
                                            <QRCode value={verifyUrl} size={42} quietZone={0} />
                                        </View>
                                        <Text style={tw`text-slate-400 text-[5px] font-bold tracking-[0.15em] mt-1.5`}>SCAN TO VERIFY</Text>
                                    </View>
                                </View>

                                {/* Footer */}
                                <View style={tw`w-full flex-row items-center justify-between px-5 h-[16px] bg-slate-50 border-t border-slate-100`}>
                                    <Text style={tw`text-slate-400 font-bold text-[5px] tracking-[0.15em]`}>PROPERTY OF NETMANAGER</Text>
                                    <Text style={[tw`font-black text-[5px] tracking-[0.1em]`, isSales ? tw`text-purple-500` : tw`text-blue-500`]}>
                                        TERDAFTAR: {formatDate(profile.createdAt)}
                                    </Text>
                                </View>

                            </View>
                        </ViewShot>
                    </View>
                </View>

            </ScrollView>

            <View style={tw`px-6 py-6 pb-28 border-t border-slate-100 bg-white shadow-xl flex-row gap-4`}>
                <TouchableOpacity
                    onPress={handleDownload}
                    disabled={isSaving}
                    style={tw`flex-1 bg-indigo-600 rounded-[20px] py-4 items-center justify-center flex-row shadow-sm opacity-${isSaving ? '50' : '100'}`}
                >
                    <Download size={20} color="white" />
                    <Text style={tw`text-white font-black tracking-widest ml-2 text-xs uppercase`}>Simpan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleShare}
                    disabled={isSaving}
                    style={tw`flex-1 bg-white border-2 border-slate-200 rounded-[20px] py-4 items-center justify-center flex-row opacity-${isSaving ? '50' : '100'}`}
                >
                    <Share2 size={20} color="#64748b" />
                    <Text style={tw`text-slate-500 font-black tracking-widest ml-2 text-xs uppercase`}>Bagikan</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
