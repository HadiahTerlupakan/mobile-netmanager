import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const TopologySkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {/* Header Skeleton */}
      <View style={tw`flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200`}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={120} height={18} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      {/* Map Area Placeholder */}
      <View style={tw`flex-1 bg-gray-200 items-center justify-center`}>
        <Skeleton width="100%" height="100%" borderRadius={0} />

        {/* Mocking some map elements or a large icon */}
        <View style={tw`absolute`}>
            <Skeleton width={100} height={100} borderRadius={50} style={tw`bg-gray-300 opacity-50`} />
        </View>
      </View>

      {/* Floating Buttons Skeleton */}
      <View style={tw`absolute bottom-8 right-5 gap-3`}>
        <Skeleton width={56} height={56} borderRadius={28} />
      </View>

      <View style={tw`absolute top-28 right-4`}>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      <View style={tw`absolute top-28 left-4`}>
        <Skeleton width={100} height={40} borderRadius={20} />
      </View>
    </SafeAreaView>
  );
};
