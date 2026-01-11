import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

export default function CanvasingListScreen() {
    const router = useRouter();
    const { token } = useAuth();

    const { data: requests, isLoading, refetch, isOfflineData } = useOfflineQuery<any[]>({
        key: 'marketing_canvasing_list',
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/marketing/canvasing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!token
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50';
            case 'REJECTED': return 'text-red-600 bg-red-50';
            default: return 'text-yellow-600 bg-yellow-50';
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            <View style={tw`bg-white px-4 py-4 border-b border-gray-100 flex-row items-center justify-between`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-gray-900`}>Daftar Canvasing</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/marketing/canvasing/create')} style={tw`p-2`}>
                    <Ionicons name="add" size={28} color="#2563eb" />
                </TouchableOpacity>
            </View>

            {isOfflineData && (
                <View style={tw`bg-orange-50 px-4 py-2 flex-row items-center justify-center`}>
                    <Ionicons name="cloud-offline-outline" size={16} color="#f97316" />
                    <Text style={tw`text-xs text-orange-700 ml-2 font-medium`}>Menampilkan data offline</Text>
                </View>
            )}

            <ScrollView 
                style={tw`flex-1`}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
            >
                <View style={tw`p-4`}>
                    {requests?.length === 0 ? (
                        <View style={tw`items-center justify-center py-20`}>
                            <Ionicons name="clipboard-outline" size={64} color="#d1d5db" />
                            <Text style={tw`text-gray-500 mt-4 text-base`}>Belum ada data canvasing</Text>
                        </View>
                    ) : (
                        requests?.map((item: any) => (
                            <TouchableOpacity
                                key={item.id}
                                style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100`}
                                onPress={() => router.push(`/(app)/marketing/canvasing/${item.id}`)}
                            >
                                <View style={tw`flex-row justify-between items-start mb-2`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-base font-bold text-gray-900`}>{item.nama}</Text>
                                        <Text style={tw`text-sm text-gray-500 mt-0.5`}>{item.paket}</Text>
                                    </View>
                                    <View style={tw`px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
                                        <Text style={tw`text-xs font-bold`}>{item.status}</Text>
                                    </View>
                                </View>
                                
                                <View style={tw`flex-row items-center mt-3 pt-3 border-t border-gray-50`}>
                                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                                    <Text style={tw`text-xs text-gray-500 ml-1 flex-1`} numberOfLines={1}>
                                        {item.alamat}
                                    </Text>
                                    <Text style={tw`text-[10px] text-gray-400 ml-2`}>
                                        {new Date(item.createdAt).toLocaleDateString('id-ID')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
