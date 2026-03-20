import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Database, RefreshCcw } from 'lucide-react-native';
import tw from 'twrnc';

interface EmptyStateProps {
  title?: string;
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Data Tidak Ditemukan',
  message = 'Belum ada data yang tersedia untuk saat ini.',
  onAction,
  actionLabel = 'Refresh',
  icon,
}) => {
  return (
    <View style={tw`flex-1 items-center justify-center p-8`}>
      <View style={tw`w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4`}>
        {icon || <Database size={40} color="#9ca3af" />}
      </View>
      
      <Text style={tw`text-lg font-bold text-gray-900 mb-2 text-center`}>
        {title}
      </Text>
      
      <Text style={tw`text-sm text-gray-500 text-center mb-6 leading-5`}>
        {message}
      </Text>
      
      {onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={tw`flex-row items-center bg-gray-200 px-6 py-3 rounded-xl`}
        >
          <RefreshCcw size={18} color="#374151" style={tw`mr-2`} />
          <Text style={tw`text-gray-700 font-bold`}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
