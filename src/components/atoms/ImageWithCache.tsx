import { Image, ImageStyle } from 'expo-image';
import React, { useState } from 'react';
import { StyleProp, View, ViewStyle, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

interface ImageWithCacheProps {
  source: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  placeholder?: string;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  transition?: number;
  showLoading?: boolean;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

const DEFAULT_BLURHASH =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQfQ';

export const ImageWithCache: React.FC<ImageWithCacheProps> = ({
  source,
  style,
  containerStyle,
  placeholder = DEFAULT_BLURHASH,
  contentFit = 'cover',
  transition = 500,
  showLoading = false,
  fallbackIcon = 'image-outline',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // If no source is provided, show fallback immediately
  if (!source) {
    return (
      <View style={[style as ViewStyle, tw`bg-gray-100 items-center justify-center overflow-hidden`, containerStyle]}>
        <Ionicons name={fallbackIcon} size={24} color="#9CA3AF" />
      </View>
    );
  }

  return (
    <View style={[style as ViewStyle, tw`overflow-hidden bg-gray-100 relative`, containerStyle]}>
      <Image
        source={source}
        style={[tw`w-full h-full`, style]}
        placeholder={placeholder}
        contentFit={contentFit}
        transition={transition}
        cachePolicy="memory-disk"
        onLoadStart={() => {
          setIsLoading(true);
          setError(false);
        }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
      />

      {/* Loading Indicator Overlay */}
      {showLoading && isLoading && (
        <View style={tw`absolute inset-0 items-center justify-center bg-gray-100`}>
          <ActivityIndicator size="small" color="#9CA3AF" />
        </View>
      )}

      {/* Error Fallback Overlay */}
      {error && (
        <View style={tw`absolute inset-0 items-center justify-center bg-gray-100`}>
          <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
        </View>
      )}
    </View>
  );
};
