import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import tw from 'twrnc';
import { MessageCircle, FileText, User, HelpCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export function CustomerMenu() {
  const router = useRouter();

  const menuItems = [
    {
      id: 'tickets',
      label: 'Tiket Bantuan',
      icon: MessageCircle,
      color: '#f97316',
      bg: '#fff7ed',
      action: () => router.push('/(customer)/tickets')
    },
    {
      id: 'history',
      label: 'Riwayat Tagihan',
      icon: FileText,
      color: '#3b82f6',
      bg: '#eff6ff',
      action: () => router.push('/(customer)/history')
    },
    {
      id: 'profile',
      label: 'Profil Saya',
      icon: User,
      color: '#8b5cf6',
      bg: '#f5f3ff',
      action: () => router.push('/(customer)/profile')
    },
    {
      id: 'help',
      label: 'Pusat Bantuan',
      icon: HelpCircle,
      color: '#10b981',
      bg: '#ecfdf5',
      action: () => {} // router.push('/(customer)/help')
    }
  ];

  return (
    <View style={tw`flex-row flex-wrap justify-between`}>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={item.action}
          style={tw`w-[48%] bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 items-center`}
        >
          <View style={[tw`p-3 rounded-full mb-2`, { backgroundColor: item.bg }]}>
            <item.icon size={24} color={item.color} />
          </View>
          <Text style={tw`text-gray-700 font-medium text-sm`}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
