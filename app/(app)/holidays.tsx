import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    getDay,
    isSameDay,
    startOfMonth,
    subMonths
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface Holiday {
    id: string;
    name: string;
    date: string;
    isNational: boolean; // true = Libur Nasional (merah), false = Cuti Bersama (orange)
}

export default function HolidaysScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchHolidays(currentDate.getFullYear());
    }, [currentDate.getFullYear()]);

    const fetchHolidays = async (year: number) => {
        setLoading(true);
        try {
            const res = await axios.get(`${Config.API_URL}/api/mobile/holidays?year=${year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setHolidays(res.data.data);
            }
        } catch (error) {
            console.error('Fetch holidays error:', error);
        } finally {
            setLoading(false);
        }
    };

    const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad start of month for calendar grid
    const startDayOfWeek = getDay(monthStart); // 0 = Sunday
    const paddingDays = Array(startDayOfWeek).fill(null);

    const getHolidayForDate = (date: Date): Holiday | undefined => {
        return holidays.find(h => isSameDay(new Date(h.date), date));
    };

    const handleDayPress = (date: Date) => {
        const holiday = getHolidayForDate(date);
        if (holiday) {
            setSelectedHoliday(holiday);
            setModalVisible(true);
        }
    };

    // Color helpers based on holiday type
    const getHolidayBgColor = (holiday: Holiday | undefined) => {
        if (!holiday) return '';
        return holiday.isNational ? 'bg-red-500' : 'bg-orange-500';
    };

    const getHolidayDotColor = (holiday: Holiday | undefined) => {
        if (!holiday) return 'bg-red-500';
        return holiday.isNational ? 'bg-red-500' : 'bg-orange-500';
    };

    const getListBgColor = (isNational: boolean) => {
        return isNational ? 'bg-red-50' : 'bg-orange-50';
    };

    const getListTextColor = (isNational: boolean) => {
        return isNational ? 'text-red-600' : 'text-orange-600';
    };

    const getListSubTextColor = (isNational: boolean) => {
        return isNational ? 'text-red-500' : 'text-orange-500';
    };

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();

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
                        {format(currentDate, 'MMMM yyyy', { locale: idLocale })}
                    </Text>
                    <TouchableOpacity onPress={goToNextMonth} style={tw`p-2 bg-gray-100 rounded-lg`}>
                        <ChevronRight size={24} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
                    {/* Day Names */}
                    <View style={tw`flex-row mb-2`}>
                        {dayNames.map((day, idx) => (
                            <View key={idx} style={tw`flex-1 items-center py-2`}>
                                <Text style={tw`text-xs font-bold ${idx === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {day}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Days Grid */}
                    {loading ? (
                        <View style={tw`py-20 items-center`}>
                            <ActivityIndicator size="large" color="#2563eb" />
                        </View>
                    ) : (
                        <View style={tw`flex-row flex-wrap`}>
                            {/* Padding Days */}
                            {paddingDays.map((_, idx) => (
                                <View key={`pad-${idx}`} style={tw`w-[14.28%] aspect-square`} />
                            ))}

                            {/* Actual Days */}
                            {daysInMonth.map((date, idx) => {
                                const holiday = getHolidayForDate(date);
                                const isToday = isSameDay(date, today);
                                const isSunday = getDay(date) === 0;

                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => handleDayPress(date)}
                                        style={tw`w-[14.28%] aspect-square items-center justify-center`}
                                    >
                                        <View style={tw`w-10 h-10 rounded-full items-center justify-center ${
                                            holiday ? getHolidayBgColor(holiday) : isToday ? 'bg-blue-500' : ''
                                        }`}>
                                            <Text style={tw`font-medium ${
                                                holiday ? 'text-white' : 
                                                isToday ? 'text-white' : 
                                                isSunday ? 'text-red-500' : 'text-gray-800'
                                            }`}>
                                                {format(date, 'd')}
                                            </Text>
                                        </View>
                                        {holiday && (
                                            <View style={tw`w-1.5 h-1.5 rounded-full ${getHolidayDotColor(holiday)} mt-0.5`} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Upcoming Holidays List */}
                <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
                    <Text style={tw`font-bold text-gray-900 mb-3`}>
                        Hari Libur {format(currentDate, 'yyyy')}
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
                                style={tw`flex-row items-center py-3 ${
                                    idx !== holidays.length - 1 ? 'border-b border-gray-100' : ''
                                }`}
                            >
                                <View style={tw`w-12 h-12 ${getListBgColor(holiday.isNational)} rounded-lg items-center justify-center mr-3`}>
                                    <Text style={tw`text-lg font-bold ${getListTextColor(holiday.isNational)}`}>
                                        {format(new Date(holiday.date), 'd')}
                                    </Text>
                                    <Text style={tw`text-[10px] ${getListSubTextColor(holiday.isNational)} -mt-1`}>
                                        {format(new Date(holiday.date), 'MMM', { locale: idLocale })}
                                    </Text>
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`font-semibold text-gray-900`}>{holiday.name}</Text>
                                    <Text style={tw`text-xs text-gray-500`}>
                                        {holiday.isNational ? 'Libur Nasional' : 'Cuti Bersama'} • {format(new Date(holiday.date), 'EEEE', { locale: idLocale })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
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
                                    {selectedHoliday && format(new Date(selectedHoliday.date), 'd')}
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
                                {selectedHoliday && format(new Date(selectedHoliday.date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
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
        </SafeAreaView>
    );
}
