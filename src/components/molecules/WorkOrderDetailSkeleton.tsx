import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const WorkOrderDetailSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header Skeleton */}
      <View style={tw`px-4 py-3 flex-row items-center border-b border-gray-200 bg-white`}>
        <Skeleton width={24} height={24} borderRadius={12} style={tw`mr-4`} />
        <View style={tw`flex-1 gap-1`}>
          <Skeleton width={150} height={18} />
          <Skeleton width={80} height={12} />
        </View>
      </View>

      {/* Tabs Skeleton */}
      <View style={tw`flex-row bg-white border-b border-gray-200 px-2`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={tw`flex-1 items-center justify-center py-3 border-b-2 border-transparent gap-1`}>
            <Skeleton width={16} height={16} borderRadius={4} />
            <Skeleton width={40} height={10} />
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={tw`p-4`} scrollEnabled={false}>
        {/* Status Card Skeleton */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
          <View style={tw`flex-row justify-between mb-4`}>
            <Skeleton width={100} height={12} />
            <Skeleton width={60} height={12} />
          </View>
          <View style={tw`flex-row justify-between`}>
            <Skeleton width={80} height={24} borderRadius={12} />
            <Skeleton width={120} height={24} borderRadius={8} />
          </View>
        </View>

        {/* Description Card Skeleton */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 gap-3`}>
          <Skeleton width={120} height={12} />
          <Skeleton width="70%" height={20} />
          <Skeleton width="100%" height={60} borderRadius={8} />
        </View>

        {/* Info Items Skeleton */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 gap-4`}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={tw`flex-row`}>
              <Skeleton width={20} height={20} borderRadius={4} style={tw`mr-3`} />
              <View style={tw`flex-1 gap-1`}>
                <Skeleton width={60} height={10} />
                <Skeleton width="80%" height={14} />
              </View>
            </View>
          ))}
        </View>

        {/* Team Card Skeleton */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100`}>
          <View style={tw`flex-row justify-between mb-4`}>
            <Skeleton width={100} height={12} />
            <Skeleton width={60} height={12} />
          </View>
          <View style={tw`flex-row items-center bg-blue-50 p-2 rounded-lg`}>
            <Skeleton width={32} height={32} borderRadius={16} style={tw`mr-3`} />
            <View style={tw`flex-1 gap-1`}>
              <Skeleton width={120} height={14} />
              <Skeleton width={80} height={10} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button Skeleton */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 shadow-lg`}>
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>
    </SafeAreaView>
  );
};
