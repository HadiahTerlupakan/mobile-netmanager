import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const HolidaySkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header Skeleton */}
      <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200`}>
        <Skeleton width={24} height={24} borderRadius={12} style={tw`mr-4`} />
        <Skeleton width={120} height={18} style={tw`flex-1`} />
        <Skeleton width={60} height={28} borderRadius={8} />
      </View>

      <ScrollView contentContainerStyle={tw`p-4`} scrollEnabled={false}>
        {/* Legend Skeleton */}
        <View style={tw`flex-row items-center justify-center gap-4 mb-4`}>
          <View style={tw`flex-row items-center`}>
            <Skeleton width={12} height={12} borderRadius={6} style={tw`mr-1.5`} />
            <Skeleton width={80} height={10} />
          </View>
          <View style={tw`flex-row items-center`}>
            <Skeleton width={12} height={12} borderRadius={6} style={tw`mr-1.5`} />
            <Skeleton width={80} height={10} />
          </View>
        </View>

        {/* Month Navigator Skeleton */}
        <View style={tw`flex-row items-center justify-between bg-white p-4 rounded-xl mb-4 shadow-sm`}>
          <Skeleton width={40} height={40} borderRadius={8} />
          <Skeleton width={120} height={20} />
          <Skeleton width={40} height={40} borderRadius={8} />
        </View>

        {/* Calendar Grid Skeleton */}
        <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
          <View style={tw`flex-row mb-4`}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View key={i} style={tw`flex-1 items-center`}>
                <Skeleton width={20} height={12} />
              </View>
            ))}
          </View>
          <View style={tw`flex-row flex-wrap`}>
            {[...Array(31)].map((_, i) => (
              <View key={i} style={tw`w-[14.28%] aspect-square items-center justify-center p-1`}>
                <Skeleton width="100%" height="100%" borderRadius={20} />
              </View>
            ))}
          </View>
        </View>

        {/* List Skeleton */}
        <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
          <Skeleton width={150} height={16} style={tw`mb-4`} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={tw`flex-row items-center py-3 border-b border-gray-100`}>
              <Skeleton width={48} height={48} borderRadius={8} style={tw`mr-3`} />
              <View style={tw`flex-1 gap-2`}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="40%" height={10} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
