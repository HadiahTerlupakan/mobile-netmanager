import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, TouchableOpacityProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import tw from 'twrnc';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return tw`bg-blue-600 border border-blue-600`;
      case 'secondary':
        return tw`bg-gray-100 border border-gray-100`;
      case 'outline':
        return tw`bg-transparent border border-blue-600`;
      case 'ghost':
        return tw`bg-transparent border-0`;
      case 'danger':
        return tw`bg-red-600 border border-red-600`;
      default:
        return tw`bg-blue-600 border border-blue-600`;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return tw`h-8 px-3 rounded-lg`;
      case 'md':
        return tw`h-12 px-4 rounded-xl`;
      case 'lg':
        return tw`h-14 px-6 rounded-xl`;
      default:
        return tw`h-12 px-4 rounded-xl`;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return tw`text-white`;
      case 'secondary':
        return tw`text-gray-900`;
      case 'outline':
      case 'ghost':
        return tw`text-blue-600`;
      default:
        return tw`text-white`;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'sm':
        return tw`text-sm`;
      case 'md':
        return tw`text-base`;
      case 'lg':
        return tw`text-lg`;
      default:
        return tw`text-base`;
    }
  };

  return (
    <TouchableOpacity
      style={[
        tw`flex-row items-center justify-center shadow-sm`,
        getVariantStyle(),
        getSizeStyle(),
        disabled || loading ? tw`opacity-70` : undefined,
        style as ViewStyle,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#2563eb' : '#fff'} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text
            style={[
              tw`font-bold text-center`,
              getTextStyle(),
              getTextSizeStyle(),
              icon ? tw`ml-2` : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
