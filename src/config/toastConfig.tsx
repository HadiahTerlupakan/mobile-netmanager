import React from 'react';
import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';
import tw from 'twrnc';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={tw`border-l-8 border-green-500 bg-white h-auto py-3 shadow-lg rounded-xl mx-4`}
      contentContainerStyle={tw`px-4`}
      renderLeadingIcon={() => (
        <View style={tw`pl-4 justify-center`}>
          <CheckCircle2 size={24} color="#10b981" />
        </View>
      )}
      text1Style={tw`text-base font-bold text-gray-900`}
      text2Style={tw`text-sm text-gray-600`}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={tw`border-l-8 border-red-500 bg-white h-auto py-3 shadow-lg rounded-xl mx-4`}
      contentContainerStyle={tw`px-4`}
      renderLeadingIcon={() => (
        <View style={tw`pl-4 justify-center`}>
          <AlertCircle size={24} color="#ef4444" />
        </View>
      )}
      text1Style={tw`text-base font-bold text-gray-900`}
      text2Style={tw`text-sm text-gray-600`}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      style={tw`border-l-8 border-blue-500 bg-white h-auto py-3 shadow-lg rounded-xl mx-4`}
      contentContainerStyle={tw`px-4`}
      renderLeadingIcon={() => (
        <View style={tw`pl-4 justify-center`}>
          <Info size={24} color="#3b82f6" />
        </View>
      )}
      text1Style={tw`text-base font-bold text-gray-900`}
      text2Style={tw`text-sm text-gray-600`}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),

  warning: (props) => (
    <BaseToast
      {...props}
      style={tw`border-l-8 border-amber-500 bg-white h-auto py-3 shadow-lg rounded-xl mx-4`}
      contentContainerStyle={tw`px-4`}
      renderLeadingIcon={() => (
        <View style={tw`pl-4 justify-center`}>
          <AlertTriangle size={24} color="#f59e0b" />
        </View>
      )}
      text1Style={tw`text-base font-bold text-gray-900`}
      text2Style={tw`text-sm text-gray-600`}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
    />
  ),
};
