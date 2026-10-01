import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { MarkedDates } from 'react-native-calendars/src/types';

import { pasangKalenderIndonesia } from '@/constants/kalenderIndonesia';
import { useTemaPersona } from '@/theme';

pasangKalenderIndonesia();

interface CustomDatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    markedDates?: MarkedDates;
    minDate?: string;
    title?: string;
    /** Tanggal yang sedang terpilih ("YYYY-MM-DD"), ditandai lingkaran penuh. */
    tanggalTerpilih?: string;
}

export default function CustomDatePickerModal({
    visible,
    onClose,
    onSelect,
    markedDates = {},
    minDate,
    title = 'Pilih Tanggal',
    tanggalTerpilih,
}: CustomDatePickerModalProps) {
    const { tw, warna } = useTemaPersona();
    const tandaTanggal: MarkedDates = tanggalTerpilih
        ? {
              ...markedDates,
              [tanggalTerpilih]: {
                  customStyles: {
                      container: { backgroundColor: warna.utamaKuat },
                      text: { color: warna.teksDiAtasUtama, fontWeight: 'bold' },
                  },
              },
          }
        : markedDates;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
                <View style={tw`bg-white w-full rounded-2xl overflow-hidden shadow-xl`}>
                    {/* Header */}
                    <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}>
                        <Text style={tw`text-lg font-bold text-slate-800`}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={tw`p-1`}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar */}
                    <Calendar
                        markingType={'custom'}
                        minDate={minDate}
                        onDayPress={(day: DateData) => {
                            const date = new Date(day.dateString);
                            onSelect(date);
                            onClose();
                        }}
                        current={tanggalTerpilih}
                        markedDates={tandaTanggal}
                        theme={{
                            backgroundColor: '#ffffff',
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#64748b',
                            selectedDayBackgroundColor: '#0d9488',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#0d9488',
                            dayTextColor: '#334155',
                            textDisabledColor: '#cbd5e1',
                            dotColor: '#0d9488',
                            selectedDotColor: '#ffffff',
                            arrowColor: '#0d9488',
                            monthTextColor: '#0f172a',
                            indicatorColor: '#0d9488',
                            textDayFontWeight: '600',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12
                        }}
                    />
                </View>
            </View>
        </Modal>
    );
}
