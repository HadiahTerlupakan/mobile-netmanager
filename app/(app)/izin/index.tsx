import { Config } from "@/constants/Config";
import { useAuth } from "@/context/AuthContext";
import { useOfflineQueryCompat as useOfflineQuery } from "@/hooks/queries";
import axios from "axios";
import { format } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Plus,
    XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  attachmentUrl?: string;
  attachments?: string[];
  rejectionReason?: string;
  createdAt: string;
}

export default function IzinScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<LeaveRequest[]>([]);

  // Offline Query
  const { data: historyData, refetch: fetchHistory } = useOfflineQuery({
    key: "leaves_history",
    fetcher: async () => {
      const res = await axios.get(`${Config.API_URL}/api/mobile/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data || [];
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  useEffect(() => {
    if (historyData) setHistory(historyData);
  }, [historyData]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // Status helpers
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { bg: tw`bg-green-100`, text: tw`text-green-700` };
      case "REJECTED":
        return { bg: tw`bg-red-100`, text: tw`text-red-700` };
      default:
        return { bg: tw`bg-yellow-100`, text: tw`text-yellow-700` };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle size={16} color="#16a34a" />;
      case "REJECTED":
        return <XCircle size={16} color="#dc2626" />;
      default:
        return <Clock size={16} color="#ca8a04" />;
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        contentContainerStyle={tw`pb-20`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header - Teal color for Izin/Cuti */}
        <View style={tw`bg-teal-600 px-6 pt-6 pb-12 rounded-b-[40px]`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`absolute top-6 left-4`}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View style={tw`items-center`}>
            <Text style={tw`text-teal-100 font-medium text-sm mb-1`}>
              Kelola Kehadiran
            </Text>
            <Text style={tw`text-white font-bold text-2xl`}>Izin & Cuti</Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={tw`px-4 -mt-8`}>
          <View
            style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}
          >
            {/* Action Button */}
            <TouchableOpacity
              onPress={() => router.push("/izin/form")}
              style={tw`bg-teal-600 py-4 rounded-xl flex-row items-center justify-center mb-4`}
            >
              <Plus size={20} color="white" />
              <Text style={tw`text-white font-bold ml-2`}>
                Buat Pengajuan Baru
              </Text>
            </TouchableOpacity>

            {/* History */}
            <View style={tw`flex-row items-center mb-3`}>
              <Clock size={18} color="#1e293b" />
              <Text style={tw`text-lg font-bold text-slate-900 ml-2`}>
                Riwayat Pengajuan
              </Text>
            </View>

            {history.length === 0 ? (
              <Text style={tw`text-gray-400 text-center py-8`}>
                Belum ada riwayat pengajuan.
              </Text>
            ) : (
              history.map((item) => {
                const statusStyle = getStatusStyle(item.status);
                return (
                  <View
                    key={item.id}
                    style={tw`bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100`}
                  >
                    <View style={tw`flex-row justify-between items-start mb-2`}>
                      <View>
                        <Text style={tw`font-bold text-sm text-slate-900`}>
                          {item.type}
                        </Text>
                        <Text style={tw`text-xs text-slate-500`}>
                          {format(new Date(item.startDate), "dd MMM yyyy")} -{" "}
                          {format(new Date(item.endDate), "dd MMM yyyy")}
                        </Text>
                      </View>
                      <View
                        style={[
                          tw`px-2 py-1 rounded-lg flex-row items-center gap-1`,
                          statusStyle.bg,
                        ]}
                      >
                        {getStatusIcon(item.status)}
                        <Text style={[tw`text-xs font-bold`, statusStyle.text]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <View style={tw`bg-white p-2 rounded-lg`}>
                      <Text style={tw`text-sm text-slate-600 italic`}>
                        &quot;{item.reason}&quot;
                      </Text>
                    </View>
                    {item.rejectionReason && (
                      <Text style={tw`text-xs text-red-500 mt-2`}>
                        Alasan Penolakan: {item.rejectionReason}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
