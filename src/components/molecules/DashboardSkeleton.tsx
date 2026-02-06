import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const DashboardSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header Skeleton */}
      <View style={tw`flex-row items-center justify-between px-4 py-3 bg-white`}>
        <View style={tw`flex-row items-center gap-3`}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={tw`gap-1`}>
            <Skeleton width={100} height={12} />
            <Skeleton width={150} height={16} />
          </View>
        </View>
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>

      <ScrollView contentContainerStyle={tw`pb-10 pt-4`} scrollEnabled={false}>
        {/* Welcome Section */}
        <View style={tw`px-4 pb-4 gap-2`}>
          <Skeleton width={120} height={14} />
          <Skeleton width={200} height={28} />
        </View>

        {/* Card Carousel Skeleton */}
        <View style={tw`px-4 mb-6`}>
          <Skeleton width="100%" height={160} borderRadius={16} />
          <View style={tw`flex-row justify-center mt-4 gap-2`}>
            <Skeleton width={24} height={8} borderRadius={4} />
            <Skeleton width={8} height={8} borderRadius={4} />
          </View>
        </View>

        {/* Stats Section Skeleton */}
        <View style={tw`mx-4 mb-6 p-4 bg-white rounded-2xl shadow-sm gap-4`}>
          <Skeleton width={100} height={16} />
          <View style={tw`flex-row justify-between`}>
            <View style={tw`items-center gap-2`}>
              <Skeleton width={60} height={24} />
              <Skeleton width={40} height={12} />
            </View>
            <View style={tw`items-center gap-2`}>
              <Skeleton width={60} height={24} />
              <Skeleton width={40} height={12} />
            </View>
            <View style={tw`items-center gap-2`}>
              <Skeleton width={60} height={24} />
              <Skeleton width={40} height={12} />
            </View>
          </View>
        </View>

        {/* Quick Menu Skeleton */}
        <View style={tw`px-4 gap-4`}>
          <Skeleton width={120} height={18} />
          <View style={tw`flex-row flex-wrap gap-4`}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <View key={i} style={[tw`items-center gap-2`, { width: '21%' }]}>
                <Skeleton width={50} height={50} borderRadius={12} />
                <Skeleton width={40} height={10} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
