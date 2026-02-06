import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const CanvasingDetailSkeleton = () => {
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Premium Header Skeleton */}
      <View style={tw`bg-indigo-700 pt-12 pb-24 px-5`}>
        <View style={tw`flex-row items-center justify-between mb-6`}>
          <Skeleton width={40} height={40} borderRadius={20} style={tw`bg-indigo-600`} />
          <Skeleton width={150} height={18} style={tw`bg-indigo-600`} />
          <View style={tw`w-10`} />
        </View>

        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-1 mr-4 gap-2`}>
            <Skeleton width={120} height={12} style={tw`bg-indigo-600`} />
            <Skeleton width="80%" height={28} style={tw`bg-indigo-600`} />
            <View style={tw`flex-row items-center gap-1`}>
              <Skeleton width={12} height={12} borderRadius={6} style={tw`bg-indigo-600`} />
              <Skeleton width={150} height={12} style={tw`bg-indigo-600`} />
            </View>
          </View>
          <Skeleton width={64} height={64} borderRadius={16} style={tw`bg-indigo-600`} />
        </View>
      </View>

      <ScrollView style={tw`flex-1 -mt-12`} contentContainerStyle={tw`px-5 pb-32`} scrollEnabled={false}>
        {/* Quick Actions Skeleton */}
        <View style={tw`bg-white rounded-3xl p-5 shadow-lg mb-6 flex-row justify-between border border-gray-100`}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={tw`items-center flex-1 gap-2`}>
              <Skeleton width={48} height={48} borderRadius={16} />
              <Skeleton width={40} height={10} />
            </View>
          ))}
        </View>

        {/* Info Cards Skeleton */}
        <View style={tw`gap-6`}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={tw`bg-white rounded-3xl p-5 shadow-sm border border-gray-100`}>
              <View style={tw`flex-row items-center mb-4 pb-4 border-b border-gray-50`}>
                <Skeleton width={32} height={32} borderRadius={12} style={tw`mr-3`} />
                <Skeleton width={120} height={16} />
              </View>
              <View style={tw`gap-4`}>
                <View>
                  <Skeleton width={60} height={10} style={tw`mb-1`} />
                  <Skeleton width="60%" height={14} />
                </View>
                <View>
                  <Skeleton width={60} height={10} style={tw`mb-1`} />
                  <Skeleton width="80%" height={14} />
                </View>
              </View>
            </View>
          ))}

          {/* Photos Skeleton */}
          <View>
            <View style={tw`flex-row items-center mb-4 ml-1`}>
              <Skeleton width={32} height={32} borderRadius={12} style={tw`mr-3`} />
              <Skeleton width={120} height={18} />
            </View>
            <View style={tw`flex-row gap-3`}>
              <Skeleton width="48%" height={120} borderRadius={16} />
              <Skeleton width="48%" height={120} borderRadius={16} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
