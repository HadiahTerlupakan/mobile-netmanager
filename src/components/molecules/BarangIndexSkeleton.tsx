import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const BarangIndexSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header Skeleton */}
      <View style={tw`bg-white px-4 py-4 border-b border-gray-100 flex-row items-center`}>
        <Skeleton width={24} height={24} borderRadius={12} style={tw`mr-4`} />
        <Skeleton width={120} height={18} />
      </View>

      <ScrollView style={tw`flex-1`} scrollEnabled={false}>
        <View style={tw`p-4 gap-4`}>
          <Skeleton width="90%" height={14} />

          {/* Menu Cards Skeletons */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={tw`bg-white rounded-xl p-4 flex-row items-center border border-gray-100 shadow-sm`}>
              <Skeleton width={56} height={56} borderRadius={8} />
              <View style={tw`flex-1 ml-4 gap-2`}>
                <Skeleton width={100} height={16} />
                <Skeleton width={150} height={12} />
              </View>
              <Skeleton width={20} height={20} borderRadius={10} />
            </View>
          ))}

          {/* Stats Skeletons */}
          <Skeleton width={100} height={16} style={tw`mt-6`} />
          <View style={tw`flex-row gap-3`}>
            <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 gap-2`}>
              <Skeleton width={60} height={10} />
              <Skeleton width={40} height={20} />
            </View>
            <View style={tw`flex-1 bg-white p-4 rounded-xl border border-gray-100 gap-2`}>
              <Skeleton width={60} height={10} />
              <Skeleton width={40} height={20} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
