import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { Wifi, Signal, Activity } from 'lucide-react-native';

interface ServiceStatusCardProps {
  planName: string;
  status: string;
  isOnline: boolean;
}

export function ServiceStatusCard({ planName, status, isOnline }: ServiceStatusCardProps) {
  return (
    <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4`}>
      <View style={tw`flex-row items-center mb-3`}>
        <View style={tw`bg-blue-50 p-2 rounded-lg mr-3`}>
          <Wifi size={20} color="#2563eb" />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-gray-500 text-xs`}>Paket Internet</Text>
          <Text style={tw`text-gray-900 font-bold text-base`}>{planName}</Text>
        </View>
      </View>

      <View style={tw`h-px bg-gray-100 my-2`} />

      <View style={tw`flex-row justify-between pt-1`}>
        <View style={tw`flex-row items-center`}>
          <Activity size={14} color="#6b7280" />
          <Text style={tw`text-gray-600 text-sm ml-1.5`}>Status</Text>
        </View>
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} mr-1.5`} />
          <Text style={tw`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
    </View>
  );
}
