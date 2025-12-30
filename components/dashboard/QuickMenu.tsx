import { useRouter } from 'expo-router';
import { Briefcase, Calendar, CalendarDays, ClipboardCheck, Clock, Map, MessageCircle, PackageMinus, PackagePlus } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

export const QuickMenu = () => {
    const router = useRouter();

    const menuItems = [
        {
            title: 'Ambil Tiket',
            subtitle: 'Work Order',
            icon: Briefcase,
            color: 'bg-blue-50',
            iconColor: '#2563eb',
            route: '/(app)/work-order'
        },
        {
            title: 'Topology Map',
            subtitle: 'Peta Jaringan',
            icon: Map,
            color: 'bg-cyan-50',
            iconColor: '#0891b2',
            route: '/(app)/topology-map'
        },
        {
            title: 'Barang Masuk',
            subtitle: 'Input stok',
            icon: PackagePlus,
            color: 'bg-green-50',
            iconColor: '#16a34a',
            route: '/(app)/barang/masuk'
        },
        {
            title: 'Barang Keluar',
            subtitle: 'Ambil stok',
            icon: PackageMinus,
            color: 'bg-orange-50',
            iconColor: '#ea580c',
            route: '/(app)/barang/keluar'
        },
        {
            title: 'Izin & Cuti',
            subtitle: 'Sakit, Cuti',
            icon: Calendar,
            color: 'bg-teal-50',
            iconColor: '#0d9488',
            route: '/(app)/izin'
        },
        {
            title: 'Absensi',
            subtitle: 'Check In/Out',
            icon: ClipboardCheck,
            color: 'bg-pink-50',
            iconColor: '#db2777',
            route: '/(app)/absensi'
        },
        {
            title: 'Lembur',
            subtitle: 'Ajukan Lembur',
            icon: Clock,
            color: 'bg-indigo-50',
            iconColor: '#4f46e5',
            route: '/(app)/lembur'
        },
        {
            title: 'Chat',
            subtitle: 'Pesan & Diskusi',
            icon: MessageCircle,
            color: 'bg-purple-50',
            iconColor: '#9333ea',
            route: '/(app)/chat'
        },
        {
            title: 'Kalender Libur',
            subtitle: 'Hari Libur',
            icon: CalendarDays,
            color: 'bg-red-50',
            iconColor: '#dc2626',
            route: '/(app)/holidays'
        },
    ];

    return (
        <View style={tw`px-4 pb-8`}>
            <Text style={tw`text-lg font-bold text-gray-900 mb-3 ml-1`}>Menu Cepat</Text>
            <View style={tw`flex-row flex-wrap justify-between`}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => router.push(item.route as any)}
                        style={tw`w-[31%] mb-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-center`}
                    >
                        <View style={tw`h-10 w-10 rounded-lg ${item.color} items-center justify-center mb-2`}>
                            <item.icon size={20} color={item.iconColor} />
                        </View>
                        <Text style={tw`font-bold text-gray-900 text-xs text-center`} numberOfLines={1}>{item.title}</Text>
                        <Text style={tw`text-[10px] text-gray-500 text-center`} numberOfLines={1}>{item.subtitle}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};
