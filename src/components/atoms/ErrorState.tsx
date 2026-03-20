import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';
import tw from 'twrnc';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kesalahan saat mengambil data dari server. Silakan coba lagi.',
  onRetry,
  retryLabel = 'Coba Lagi',
}) => {
  return (
    <View style={tw`flex-1 items-center justify-center p-8`}>
      <View style={tw`w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4`}>
        <AlertTriangle size={40} color="#ef4444" />
      </View>
      
      <Text style={tw`text-lg font-bold text-gray-900 mb-2 text-center`}>
        {title}
      </Text>
      
      <Text style={tw`text-sm text-gray-500 text-center mb-6 leading-5`}>
        {message}
      </Text>
      
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={tw`flex-row items-center bg-blue-600 px-8 py-3 rounded-xl shadow-sm`}
        >
          <RefreshCcw size={18} color="white" style={tw`mr-2`} />
          <Text style={tw`text-white font-bold`}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
