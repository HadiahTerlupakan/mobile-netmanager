import { HolidaySkeleton } from '@/components/molecules/HolidaySkeleton';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';
import {
    addMonths,
    formatDate,
    subMonths
} from '@/utils/date';
import { getUserFriendlyError } from '@/utils/errorHandling';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

interface Holiday {
    id: string;
    name: string;
    date: string;
    isNational: boolean; // true = Libur Nasional (merah), false = Cuti Bersama (orange)
}

export default function HolidaysScreen() {
  useFeatureGuard(AppFeature.HOLIDAYS);

    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const year = currentDate.getFullYear();

    const {
        data: holidaysData,
        isPending: loading,
        isError,
        error,
        refetch
    } = useOfflineQuery<any, Error, Holiday[]>({
        queryKey: queryKeys.holidays.list(year),
        endpoint: `/api/mobile/holidays?year=${year}`,
        select: (data: any) => data?.data || [],
    });

    const holidays = holidaysData || [];

    useFocusEffect(
        useCallback(() => {
            void refetch();
        }, [refetch])
    );

    const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const getListBgColor = (isNational: boolean) => {
        return isNational ? 'bg-red-50' : 'bg-orange-50';
    };

    const getListTextColor = (isNational: boolean) => {
        return isNational ? 'text-red-600' : 'text-orange-600';
    };

    const getListSubTextColor = (isNational: boolean) => {
        return isNational ? 'text-red-500' : 'text-orange-500';
    };

    if (loading && holidays.length === 0) {
        return <HolidaySkeleton />;
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`flex-1 text-lg font-bold text-gray-900 ml-2`}>
                    Kalender Libur
                </Text>
                <TouchableOpacity onPress={goToToday} style={tw`px-3 py-1 bg-blue-50 rounded-lg`}>
                    <Text style={tw`text-blue-600 font-medium text-sm`}>Hari Ini</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>
                {/* Legend */}
                <View style={tw`flex-row items-center justify-center gap-4 mb-4`}>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`w-3 h-3 rounded-full bg-red-500 mr-1.5`} />
                        <Text style={tw`text-xs text-gray-600`}>Libur Nasional</Text>
                    </View>
                    <View style={tw`flex-row items-center`}>
                        <View style={tw`w-3 h-3 rounded-full bg-orange-500 mr-1.5`} />
                        <Text style={tw`text-xs text-gray-600`}>Cuti Bersama</Text>
                    </View>
                </View>

                {/* Month Navigator */}
                <View style={tw`flex-row items-center justify-between bg-white p-4 rounded-xl mb-4 shadow-sm`}>
                    <TouchableOpacity onPress={goToPrevMonth} style={tw`p-2 bg-gray-100 rounded-lg`}>
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-gray-900`}>
                        {formatDate(currentDate, 'MMMM yyyy')}
                    </Text>
                    <TouchableOpacity onPress={goToNextMonth} style={tw`p-2 bg-gray-100 rounded-lg`}>
                        <ChevronRight size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {isError && holidays.length === 0 ? (
                    <View style={tw`items-center justify-center py-10`}>
                        <AlertTriangle size={48} color="#dc2626" />
                        <Text style={tw`text-red-600 font-bold text-lg mt-4 text-center`}>
                            Gagal memuat data libur
                        </Text>
                        <Text style={tw`text-gray-500 text-center mt-2 mb-4 px-4`}>
                            {getUserFriendlyError(error).message}
                        </Text>
                        <TouchableOpacity
                            onPress={() => refetch()}
                            style={tw`bg-blue-600 px-6 py-2 rounded-full`}
                        >
                            <Text style={tw`text-white font-bold`}>Coba Lagi</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Calendar Grid */}


                        {/* Upcoming Holidays List */}
                        <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
                            <Text style={tw`font-bold text-gray-900 mb-3`}>
                                Hari Libur {formatDate(currentDate, 'yyyy')}
                            </Text>
                            {holidays.length === 0 ? (
                                <Text style={tw`text-gray-400 text-center py-4`}>
                                    Tidak ada data hari libur
                                </Text>
                            ) : (
                                holidays.map((holiday, idx) => (
                                    <TouchableOpacity
                                        key={holiday.id}
                                        onPress={() => {
                                            setSelectedHoliday(holiday);
                                            setModalVisible(true);
                                        }}
                                        style={tw`flex-row items-center py-3 ${idx !== holidays.length - 1 ? 'border-b border-gray-100' : ''
                                            }`}
                                    >
                                        <View style={tw`w-12 h-12 ${getListBgColor(holiday.isNational)} rounded-lg items-center justify-center mr-3`}>
                                            <Text style={tw`text-lg font-bold ${getListTextColor(holiday.isNational)}`}>
                                                {formatDate(holiday.date, 'd')}
                                            </Text>
                                            <Text style={tw`text-[10px] ${getListSubTextColor(holiday.isNational)} -mt-1`}>
                                                {formatDate(holiday.date, 'MMM')}
                                            </Text>
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <Text style={tw`font-semibold text-gray-900`}>{holiday.name}</Text>
                                            <Text style={tw`text-xs text-gray-500`}>
                                                {holiday.isNational ? 'Libur Nasional' : 'Cuti Bersama'} • {formatDate(holiday.date, 'EEEE')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Holiday Detail Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={tw`flex-1 bg-black/50 justify-center items-center p-6`}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
                        <View style={tw`items-center mb-4`}>
                            <View style={tw`w-16 h-16 ${selectedHoliday?.isNational ? 'bg-red-100' : 'bg-orange-100'} rounded-full items-center justify-center mb-3`}>
                                <Text style={tw`text-2xl font-bold ${selectedHoliday?.isNational ? 'text-red-600' : 'text-orange-600'}`}>
                                    {selectedHoliday && formatDate(selectedHoliday.date, 'd')}
                                </Text>
                            </View>
                            <View style={tw`px-3 py-1 ${selectedHoliday?.isNational ? 'bg-red-100' : 'bg-orange-100'} rounded-full mb-2`}>
                                <Text style={tw`text-xs font-medium ${selectedHoliday?.isNational ? 'text-red-600' : 'text-orange-600'}`}>
                                    {selectedHoliday?.isNational ? 'Libur Nasional' : 'Cuti Bersama'}
                                </Text>
                            </View>
                            <Text style={tw`text-lg font-bold text-gray-900 text-center`}>
                                {selectedHoliday?.name}
                            </Text>
                            <Text style={tw`text-sm text-gray-500 mt-1`}>
                                {selectedHoliday && formatDate(selectedHoliday.date, 'EEEE, dd MMMM yyyy')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={tw`bg-gray-100 py-3 rounded-xl`}
                        >
                            <Text style={tw`text-center font-semibold text-gray-700`}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView >
    );
}
