import { Href, useRouter } from 'expo-router';
import { Clock, MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { DashboardHeader } from './DashboardHeader';

interface BerandaModeCutiProps {
  userName: string;
  userImage: string | null;
}

/** Beranda saat karyawan cuti/izin: fitur dibatasi, hanya Chat. */
export function BerandaModeCuti({ userName, userImage }: BerandaModeCutiProps) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={tw`flex-1 bg-gray-50`}>
      <DashboardHeader userName={userName} userImage={userImage} />

      <View style={tw`flex-1 items-center justify-center p-6`}>
        <View style={tw`w-24 h-24 bg-yellow-100 rounded-full items-center justify-center mb-6`}>
          <Clock size={48} color="#ca8a04" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900 text-center mb-2`}>Mode Cuti Aktif</Text>
        <Text style={tw`text-gray-500 text-center mb-8`}>
          Anda sedang dalam masa cuti/izin. Akses fitur dibatasi untuk kenyamanan istirahat Anda.
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(app)/chat' as Href)}
          style={tw`bg-purple-600 w-full py-4 rounded-xl flex-row items-center justify-center gap-2`}
          accessibilityLabel="Buka chat"
          accessibilityRole="button"
        >
          <MessageCircle size={24} color="white" />
          <Text style={tw`text-white font-bold text-lg`}>Buka Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
