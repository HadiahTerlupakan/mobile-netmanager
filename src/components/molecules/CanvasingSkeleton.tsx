import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const CanvasingItemSkeleton = () => {
  return (
    <View style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100`}>
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View style={tw`flex-1 mr-3 gap-2`}>
          <Skeleton width="70%" height={20} />
          <Skeleton width={100} height={14} />
        </View>
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>

      <View style={tw`bg-gray-50 rounded-2xl p-3 mb-4`}>
        <Skeleton width="100%" height={14} />
      </View>

      <View style={tw`flex-row items-center justify-between`}>
        <Skeleton width={100} height={12} />
        <Skeleton width={60} height={20} borderRadius={8} />
      </View>
    </View>
  );
};

export const CanvasingSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top"]}>
      {/* Header Skeleton */}
      <View style={tw`bg-indigo-700 pb-6 px-5`}>
        <View style={tw`flex-row items-center justify-between pt-4 mb-6`}>
          <Skeleton width={40} height={40} borderRadius={20} style={tw`bg-indigo-600`} />
          <Skeleton width={150} height={18} style={tw`bg-indigo-600`} />
          <Skeleton width={40} height={40} borderRadius={20} style={tw`bg-indigo-600`} />
        </View>

        <View style={tw`flex-row items-center justify-between mb-6`}>
          <View style={tw`gap-2`}>
            <Skeleton width={100} height={12} style={tw`bg-indigo-600`} />
            <Skeleton width={80} height={36} style={tw`bg-indigo-600`} />
          </View>
          <View style={tw`items-end gap-2`}>
            <Skeleton width={100} height={16} borderRadius={8} style={tw`bg-indigo-600`} />
            <Skeleton width={80} height={20} style={tw`bg-indigo-600`} />
          </View>
        </View>

        <Skeleton width="100%" height={8} borderRadius={4} style={tw`bg-indigo-900/50 mb-6`} />

        <View style={tw`flex-row gap-3`}>
          <Skeleton width="31%" height={60} borderRadius={16} style={tw`bg-indigo-600`} />
          <Skeleton width="31%" height={60} borderRadius={16} style={tw`bg-indigo-600`} />
          <Skeleton width="31%" height={60} borderRadius={16} style={tw`bg-indigo-600`} />
        </View>
      </View>

      <View style={tw`bg-white px-5 py-4 shadow-sm`}>
        <Skeleton width="100%" height={40} borderRadius={16} />
      </View>

      <ScrollView contentContainerStyle={tw`p-4`} scrollEnabled={false}>
        {[1, 2, 3].map((i) => (
          <CanvasingItemSkeleton key={i} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
