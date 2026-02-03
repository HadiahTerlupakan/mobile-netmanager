import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import tw from 'twrnc';

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'default', size = 'sm', style }: BadgeProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return { container: tw`bg-green-100`, text: tw`text-green-800` };
      case 'warning':
        return { container: tw`bg-yellow-100`, text: tw`text-yellow-800` };
      case 'error':
        return { container: tw`bg-red-100`, text: tw`text-red-800` };
      case 'info':
        return { container: tw`bg-blue-100`, text: tw`text-blue-800` };
      case 'neutral':
        return { container: tw`bg-gray-100`, text: tw`text-gray-800` };
      case 'default':
      default:
        return { container: tw`bg-gray-100`, text: tw`text-gray-800` };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { container: tw`px-2 py-0.5`, text: tw`text-xs` };
      case 'md':
        return { container: tw`px-3 py-1`, text: tw`text-sm` };
      default:
        return { container: tw`px-2 py-0.5`, text: tw`text-xs` };
    }
  };

  const variantStyles = getVariantStyle();
  const sizeStyles = getSizeStyle();

  return (
    <View
      style={[
        tw`rounded-full items-center justify-center self-start`,
        variantStyles.container,
        sizeStyles.container,
        style,
      ]}
    >
      <Text style={[tw`font-bold`, variantStyles.text, sizeStyles.text]}>
        {label}
      </Text>
    </View>
  );
}
