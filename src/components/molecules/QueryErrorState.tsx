import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import tw from 'twrnc';

interface QueryErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Reusable error state for screens that fail to load query data.
 * Provides a retry button when onRetry is supplied.
 */
export const QueryErrorState = React.memo(({ message, onRetry }: QueryErrorStateProps) => (
  <View style={tw`flex-1 items-center justify-center p-6`}>
    <View style={tw`bg-red-50 p-4 rounded-full mb-4`}>
      <AlertTriangle size={32} color="#dc2626" />
    </View>
    <Text style={tw`text-gray-800 font-bold text-base mb-1`}>Gagal Memuat Data</Text>
    <Text style={tw`text-gray-500 text-sm text-center mb-4`}>
      {message || 'Terjadi kesalahan. Periksa koneksi internet Anda.'}
    </Text>
    {onRetry && (
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Coba lagi"
        style={tw`flex-row items-center bg-red-600 px-4 py-2 rounded-lg`}
      >
        <RefreshCw size={16} color="white" />
        <Text style={tw`text-white font-bold ml-2`}>Coba Lagi</Text>
      </TouchableOpacity>
    )}
  </View>
));
QueryErrorState.displayName = 'QueryErrorState';
