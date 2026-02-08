import { CanvasingDetailSkeleton } from '@/components/molecules/CanvasingDetailSkeleton';
import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import { Config } from '@/constants/Config';
import { TenantService } from '@/services/TenantService';
import { useAuth } from '@/context/AuthContext';
import { useApiQuery } from '@/hooks/queries';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import { Canvasing, CanvasingClaim } from '@/types/marketing';
import { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function CanvasingDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { token } = useAuth();

    const { data: item, isPending, fetchStatus } = useApiQuery<Canvasing>({
        queryKey: [`marketing_canvasing_detail`, String(id)],
        endpoint: `/api/marketing/canvasing/${id}`,
        enabled: !!id && !!token
    });

    const isOffline = fetchStatus === 'paused';

    interface ClaimResponse {
        claim: CanvasingClaim | null;
    }

    // Fetch claim status
    const { data: claimData } = useApiQuery<ClaimResponse>({
        queryKey: [`marketing_canvasing_claim`, String(id)],
        endpoint: `/api/marketing/canvasing/${id}/claim`,
        enabled: !!id && !!token
    });

    const claim = claimData?.claim;

    const openMaps = () => {
        if (item?.latitude && item?.longitude) {
            const url = Platform.select({
                ios: `maps:0,0?q=${item.latitude},${item.longitude}`,
                android: `geo:0,0?q=${item.latitude},${item.longitude}`
            });
            if (url) Linking.openURL(url);
            return;
        }

        if (item?.shareloc) {
             Linking.openURL(item.shareloc);
             return;
        }

        Alert.alert('Info', 'Lokasi tidak tersedia (Map & Lat/Long kosong)');
    };

    const openWhatsApp = () => {
        if (!item?.noTelpon) {
             Alert.alert('Info', 'Nomor telepon tidak tersedia');
             return;
        }
        let phone = item.noTelpon.replace(/\D/g, '').replace(/^0/, '62');
        if (!phone.startsWith('62')) phone = '62' + phone;
        Linking.openURL(`https://wa.me/${phone}`);
    };

    const callNumber = () => {
        if (!item?.noTelpon) {
             Alert.alert('Info', 'Nomor telepon tidak tersedia');
             return;
        }
        Linking.openURL(`tel:${item.noTelpon}`);
    };

    const copyID = async () => {
        const textToCopy = item?.sn || item?.id || '';
        if (textToCopy) {
            try {
                await Share.share({
                    message: textToCopy,
                });
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Gagal menyalin ID';
                Alert.alert('Error', message);
            }
        } else {
             Alert.alert('Info', 'Tidak ada ID yang bisa disalin');
        }
    };

    // Check if can claim - WO must be completed
    // const canClaim = () => {
    //     if (!item) return false;
    //     if (claim) return false; // Already claimed
    //     if (item.isLocked) return false;
    //
    //     const wo = item.workOrder;
    //     if (!wo) return false;
    //
    //     const completedStatuses = ['COMPLETED', 'VERIFIED', 'CLOSED'];
    //     return completedStatuses.includes(wo.status);
    // };

    const getClaimStatusUI = () => {
        if (!claim) return null;

        switch (claim.status) {
            case 'APPROVED':
                return { bg: 'bg-emerald-50', color: 'text-emerald-700', icon: 'checkmark-circle' as const, label: 'Claim Disetujui (+2 Poin)' };
            case 'REJECTED':
                return { bg: 'bg-rose-50', color: 'text-rose-700', icon: 'close-circle' as const, label: 'Claim Ditolak' };
            default:
                return { bg: 'bg-amber-50', color: 'text-amber-700', icon: 'time' as const, label: 'Menunggu Review Admin' };
        }
    };

    if (isPending && !item) {
        return <CanvasingDetailSkeleton />;
    }

    if (!item) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-white p-8`}>
                <View style={tw`w-20 h-20 bg-rose-50 items-center justify-center rounded-full mb-6`}>
                    <Ionicons name="alert-circle" size={48} color="#ef4444" />
                </View>
                <Text style={tw`text-xl font-bold text-gray-900 text-center`}>Data Tidak Ditemukan</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={tw`mt-8 bg-indigo-600 px-8 py-3 rounded-2xl shadow-sm`}
                >
                    <Text style={tw`text-white font-bold`}>Kembali ke Daftar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusUI = getStatusUI(item.status);
    const claimStatusUI = getClaimStatusUI();

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Premium Header */}
            <View style={tw`bg-indigo-700 pt-12 pb-24 px-5 shadow-xl z-0`}>
                <View style={tw`flex-row items-center justify-between mb-6`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={tw`w-10 h-10 items-center justify-center bg-white/10 rounded-full`}
                    >
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-black text-white uppercase tracking-tighter`}>Detail Pelanggan</Text>
                    <View style={tw`w-10`} />
                </View>

                {/* Hero Content */}
                <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-1 mr-4`}>
                        <Text style={tw`text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1`}>
                            {item.sn || 'NO SERIAL NUMBER'}
                        </Text>
                        <Text style={tw`text-white text-2xl font-black leading-8 mb-2`}>
                            {item.nama}
                        </Text>
                        <View style={tw`flex-row items-center`}>
                            <Ionicons name="location" size={14} color="#a5b4fc" />
                            <Text style={tw`text-indigo-100 text-xs font-medium ml-1`} numberOfLines={1}>
                                {item.alamat}
                            </Text>
                        </View>
                    </View>

                    {/* Status Badge */}
                    <View style={tw`${statusUI.bg} w-16 h-16 rounded-2xl border-4 border-white/10 items-center justify-center shadow-lg`}>
                        <Ionicons name={statusUI.icon} size={28} color={statusUI.fgColor} />
                    </View>
                </View>
            </View>

            <ScrollView
                style={tw`flex-1 -mt-12 z-10`}
                contentContainerStyle={tw`px-5 pb-32`}
                showsVerticalScrollIndicator={false}
            >
                {/* Offline Badge */}
                {isOffline && (
                    <View style={tw`bg-amber-100 p-2 rounded-xl mb-4 flex-row items-center justify-center shadow-sm`}>
                        <Ionicons name="cloud-offline" size={16} color="#d97706" />
                        <Text style={tw`text-xs font-bold text-amber-700 ml-2`}>Mode Offline</Text>
                    </View>
                )}

                {/* Claim Status Card - Show if claim exists */}
                {claimStatusUI && (
                    <View style={tw`${claimStatusUI.bg} rounded-2xl p-4 mb-4 flex-row items-center border border-gray-100`}>
                        <Ionicons name={claimStatusUI.icon} size={24} color={tw.color(claimStatusUI.color.replace('text-', '')) || undefined} />
                        <View style={tw`ml-3 flex-1`}>
                            <Text style={tw`${claimStatusUI.color} font-bold`}>{claimStatusUI.label}</Text>
                            {claim?.reviewNotes && (
                                <Text style={tw`text-gray-600 text-xs mt-1`}>{claim.reviewNotes}</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Quick Actions Card */}
                <View style={tw`bg-white rounded-3xl p-5 shadow-lg shadow-indigo-900/10 mb-6 flex-row justify-between border border-gray-100`}>
                    <QuickAction
                        icon="call"
                        label="Telepon"
                        color="bg-emerald-500"
                        onPress={callNumber}
                    />
                    <QuickAction
                        icon="logo-whatsapp"
                        label="WhatsApp"
                        color="bg-green-500"
                        onPress={openWhatsApp}
                    />
                    <QuickAction
                        icon="map"
                        label="Navigasi"
                        color="bg-blue-500"
                        onPress={openMaps}
                    />
                    <QuickAction
                        icon="copy"
                        label="Salin ID"
                        color="bg-gray-500"
                        onPress={copyID}
                    />
                </View>

                {/* Information Sections */}
                <View style={tw`gap-6`}>
                    {/* Work Order Info - if exists */}
                    {item.workOrder && (
                        <InfoCard title="Work Order" icon="construct">
                            <InfoRow label="Nomor WO" value={item.workOrder.workOrderNumber} highlighted />
                            <InfoRow label="Status WO" value={getWOStatusLabel(item.workOrder.status)} isLast />
                        </InfoCard>
                    )}

                    {/* Personal Info */}
                    <InfoCard title="Informasi Pribadi" icon="person">
                        <InfoRow label="NIK KTP" value={item.noKtp} />
                        <InfoRow label="No. Telepon" value={item.noTelpon} isLast />
                    </InfoCard>

                    {/* Technical Info */}
                    <InfoCard title="Layanan & Teknis" icon="server">
                        <InfoRow label="Paket Internet" value={item.paket} highlighted />
                        <InfoRow label="Estimasi Kabel" value={`${item.kabel} Meter`} />
                        <InfoRow label="ODP" value={item.odp} />
                        <InfoRow label="Serial Number" value={item.sn} isLast />
                    </InfoCard>

                    {/* Photos */}
                    <View>
                        <View style={tw`flex-row items-center mb-4 ml-1`}>
                            <View style={tw`w-8 h-8 bg-indigo-50 rounded-xl items-center justify-center mr-3`}>
                                <Ionicons name="images" size={16} color="#4f46e5" />
                            </View>
                            <Text style={tw`text-base font-black text-gray-900`}>Dokumentasi</Text>
                        </View>
                        <View style={tw`flex-row gap-3`}>
                            <PhotoPreview title="Lokasi" uri={item.foto} />
                            <PhotoPreview title="KTP" uri={item.fotoKtp} />
                        </View>
                    </View>

                    {/* Claim Bukti Photos - if claim exists */}
                    {claim && claim.buktiUrls && claim.buktiUrls.length > 0 && (
                        <View>
                            <View style={tw`flex-row items-center mb-4 ml-1`}>
                                <View style={tw`w-8 h-8 bg-purple-50 rounded-xl items-center justify-center mr-3`}>
                                    <Ionicons name="receipt" size={16} color="#7c3aed" />
                                </View>
                                <Text style={tw`text-base font-black text-gray-900`}>Bukti Claim</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={tw`flex-row gap-3`}>
                                    {claim.buktiUrls.map((uri: string, index: number) => (
                                        <PhotoPreview key={index} title={`Bukti ${index + 1}`} uri={uri} />
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* Footer Meta */}
                    <Text style={tw`text-center text-xs text-gray-400 font-medium py-4`}>
                        Dibuat pada {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })} • {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

// --- Helper Components ---

function getStatusUI(status: string) {
    switch (status) {
        case 'APPROVED': return { bg: 'bg-emerald-500', fgColor: 'white', icon: 'checkmark-circle' as const, label: 'Disetujui' };
        case 'REJECTED': return { bg: 'bg-rose-500', fgColor: 'white', icon: 'close-circle' as const, label: 'Ditolak' };
        default: return { bg: 'bg-amber-400', fgColor: 'white', icon: 'time' as const, label: 'Pending' };
    }
}

function getWOStatusLabel(status: string) {
    const labels: Record<string, string> = {
        'PENDING': 'Menunggu',
        'ASSIGNED': 'Ditugaskan',
        'IN_PROGRESS': 'Sedang Dikerjakan',
        'ON_HOLD': 'Ditunda',
        'COMPLETED': 'Selesai',
        'VERIFIED': 'Terverifikasi',
        'CLOSED': 'Ditutup',
        'CANCELLED': 'Dibatalkan'
    };
    return labels[status] || status;
}

interface QuickActionProps {
    icon: IoniconName;
    label: string;
    color: string;
    onPress: () => void;
}

function QuickAction({ icon, label, color, onPress }: QuickActionProps) {
    return (
        <TouchableOpacity onPress={onPress} style={tw`items-center flex-1`}>
            <View style={tw`w-12 h-12 ${color} rounded-2xl items-center justify-center shadow-sm mb-2`}>
                <Ionicons name={icon} size={22} color="white" />
            </View>
            <Text style={tw`text-[10px] font-bold text-gray-600 uppercase`}>{label}</Text>
        </TouchableOpacity>
    );
}

interface InfoCardProps {
    title: string;
    icon: IoniconName;
    children: React.ReactNode;
}

function InfoCard({ title, icon, children }: InfoCardProps) {
    return (
        <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-gray-100`}>
            <View style={tw`flex-row items-center mb-4 pb-4 border-b border-gray-50`}>
                <View style={tw`w-8 h-8 bg-indigo-50 rounded-xl items-center justify-center mr-3`}>
                    <Ionicons name={icon} size={16} color="#4f46e5" />
                </View>
                <Text style={tw`text-base font-black text-gray-900`}>{title}</Text>
            </View>
            <View>
                {children}
            </View>
        </View>
    );
}

interface InfoRowProps {
    label: string;
    value?: string | number | null;
    highlighted?: boolean;
    isLast?: boolean;
}

function InfoRow({ label, value, highlighted, isLast }: InfoRowProps) {
    return (
        <View style={tw`${isLast ? '' : 'mb-4'}`}>
            <Text style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1`}>{label}</Text>
            <Text style={tw`text-sm font-bold ${highlighted ? 'text-indigo-600 text-base' : 'text-gray-900'}`}>{value || '-'}</Text>
        </View>
    );
}

interface PhotoPreviewProps {
    title: string;
    uri?: string;
}

function PhotoPreview({ title, uri }: PhotoPreviewProps) {
    const fullUri = uri?.startsWith('http') ? uri : `${TenantService.getTenantUrl()}${uri}`;

    return (
        <View style={[tw`flex-1 bg-white rounded-2xl p-2 shadow-sm border border-gray-100`, { aspectRatio: 4/3, minWidth: 120 }]}>
            <View style={tw`flex-1 bg-gray-100 rounded-xl overflow-hidden relative`}>
                {uri ? (
                    <ImageWithCache source={fullUri} style={tw`w-full h-full`} contentFit="cover" transition={1000}       />
                ) : (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Ionicons name="image-outline" size={24} color="#d1d5db" />
                    </View>
                )}
                <View style={tw`absolute bottom-0 left-0 right-0 bg-black/50 p-2`}>
                    <Text style={tw`text-white text-[10px] font-bold text-center uppercase`}>{title}</Text>
                </View>
            </View>
        </View>
    );
}
