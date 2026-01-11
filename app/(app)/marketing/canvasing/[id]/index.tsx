import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

export default function CanvasingDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { token } = useAuth();

    const { data: item, isLoading, refetch, isOfflineData } = useOfflineQuery<any>({
        key: `marketing_canvasing_detail_${id}`,
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/marketing/canvasing/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!id && !!token
    });

    const openMaps = () => {
        if (!item?.shareloc) {
            Alert.alert('Info', 'Link shareloc tidak tersedia');
            return;
        }
        Linking.openURL(item.shareloc);
    };

    if (isLoading && !item) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-white`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!item) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-white p-4`}>
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text style={tw`text-lg font-bold text-gray-900 mt-4`}>Data tidak ditemukan</Text>
                <TouchableOpacity onPress={() => router.back()} style={tw`mt-4 bg-blue-600 px-6 py-2 rounded-lg`}>
                    <Text style={tw`text-white font-bold`}>Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50';
            case 'REJECTED': return 'text-red-600 bg-red-50';
            default: return 'text-yellow-600 bg-yellow-50';
        }
    };

    return (
        <View style={tw`flex-1 bg-white`}>
            {/* Header */}
            <View style={tw`px-4 py-4 border-b border-gray-100 flex-row items-center`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900 ml-2`}>Detail Canvasing</Text>
            </View>

            {isOfflineData && (
                <View style={tw`bg-orange-50 px-4 py-1 flex-row items-center justify-center`}>
                    <Ionicons name="cloud-offline-outline" size={12} color="#f97316" />
                    <Text style={tw`text-[10px] text-orange-700 ml-2 font-medium`}>Mode Offline</Text>
                </View>
            )}

            <ScrollView style={tw`flex-1 px-4 py-6`}>
                {/* Status Card */}
                <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6 flex-row justify-between items-center`}>
                    <View>
                        <Text style={tw`text-xs text-gray-500 uppercase font-bold`}>Status Request</Text>
                        <Text style={tw`text-sm text-gray-900 mt-1 font-medium`}>
                            {item.status === 'APPROVED' ? 'Telah Disetujui' : item.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Persetujuan'}
                        </Text>
                    </View>
                    <View style={tw`px-4 py-1.5 rounded-full ${getStatusColor(item.status)}`}>
                        <Text style={tw`text-xs font-bold`}>{item.status}</Text>
                    </View>
                </View>

                {/* Foto Section */}
                <View style={tw`flex-row gap-4 mb-6`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-bold text-gray-900 mb-2`}>Foto Lokasi</Text>
                        <View style={tw`aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden`}>
                            {item.foto ? (
                                <Image source={{ uri: item.foto.startsWith('http') ? item.foto : `${Config.API_URL}${item.foto}` }} style={tw`w-full h-full`} />
                            ) : (
                                <View style={tw`flex-1 items-center justify-center`}>
                                    <Ionicons name="image-outline" size={32} color="#d1d5db" />
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-bold text-gray-900 mb-2`}>Foto KTP</Text>
                        <View style={tw`aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden`}>
                            {item.fotoKtp ? (
                                <Image source={{ uri: item.fotoKtp.startsWith('http') ? item.fotoKtp : `${Config.API_URL}${item.fotoKtp}` }} style={tw`w-full h-full`} />
                            ) : (
                                <View style={tw`flex-1 items-center justify-center`}>
                                    <Ionicons name="card-outline" size={32} color="#d1d5db" />
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Data Pelanggan */}
                <View style={tw`mb-8`}>
                    <Text style={tw`text-lg font-extrabold text-gray-900 mb-4`}>Data Pelanggan</Text>
                    
                    <View style={tw`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm`}>
                        <InfoRow label="Nama Lengkap" value={item.nama} icon="person" />
                        <InfoRow label="NIK KTP" value={item.noKtp} icon="card" />
                        <InfoRow label="No. Telepon" value={item.noTelpon} icon="call" />
                        <InfoRow label="Paket" value={item.paket} icon="gift" />
                        <InfoRow label="Alamat" value={item.alamat} icon="location" last />
                    </View>
                </View>

                {/* Teknis Section */}
                <View style={tw`mb-8`}>
                    <Text style={tw`text-lg font-extrabold text-gray-900 mb-4`}>Detail Teknis</Text>
                    <View style={tw`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm`}>
                        <InfoRow label="Estimasi Kabel" value={`${item.kabel} Meter`} icon="infinite" />
                        <InfoRow label="ODP Terdekat" value={item.odp || '-'} icon="share-social" />
                        <InfoRow label="Serial Number" value={item.sn || '-'} icon="barcode" last />
                    </View>
                </View>

                {item.shareloc && (
                    <TouchableOpacity 
                        onPress={openMaps}
                        style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-center mb-10`}
                    >
                        <View style={tw`bg-blue-600 p-2 rounded-lg`}>
                            <Ionicons name="map" size={20} color="white" />
                        </View>
                        <View style={tw`ml-4 flex-1`}>
                            <Text style={tw`text-sm font-bold text-blue-900`}>Buka di Google Maps</Text>
                            <Text style={tw`text-xs text-blue-600 mt-0.5`}>Lihat lokasi pemasangan di peta</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#2563eb" />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

function InfoRow({ label, value, icon, last }: any) {
    return (
        <View style={tw`flex-row items-center py-3 ${last ? '' : 'border-b border-gray-50'}`}>
            <View style={tw`w-8`}>
                <Ionicons name={icon as any} size={18} color="#9CA3AF" />
            </View>
            <View style={tw`flex-1`}>
                <Text style={tw`text-[10px] text-gray-400 font-bold uppercase`}>{label}</Text>
                <Text style={tw`text-sm text-gray-800 font-medium mt-0.5`}>{value || '-'}</Text>
            </View>
        </View>
    );
}
