import React from 'react';
import { View, TextInput, Text, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import tw from 'twrnc';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...props
}: InputProps) {
  return (
    <View style={[tw`w-full`, containerStyle]}>
      {label && <Text style={tw`mb-2 font-medium text-gray-700`}>{label}</Text>}

      <View
        style={[
          tw`flex-row items-center border rounded-xl px-4 h-12 bg-gray-50`,
          error ? tw`border-red-500` : tw`border-gray-300 focus:border-blue-500`,
        ]}
      >
        {leftIcon && <View style={tw`mr-3`}>{leftIcon}</View>}

        <TextInput
          style={[tw`flex-1 text-gray-900 h-full`, style]}
          placeholderTextColor="#9ca3af"
          {...props}
        />

        {rightIcon && <View style={tw`ml-3`}>{rightIcon}</View>}
      </View>

      {error && <Text style={tw`mt-1 text-xs text-red-500`}>{error}</Text>}
    </View>
  );
}
