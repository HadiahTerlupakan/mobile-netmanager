import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const ProfileSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`pb-20`} scrollEnabled={false}>
        {/* Header Skeleton */}
        <View style={tw`bg-blue-600 px-6 pt-6 pb-16 rounded-b-[40px] items-center`}>
          <Skeleton width={96} height={96} borderRadius={48} style={tw`mb-4 border-4 border-white`} />
          <Skeleton width={150} height={24} style={tw`mb-2`} />
          <Skeleton width={180} height={16} style={tw`mb-3`} />
          <Skeleton width={80} height={24} borderRadius={12} />
        </View>

        {/* Info Cards Skeleton */}
        <View style={tw`px-4 -mt-8`}>
          <View style={tw`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={tw`flex-row items-center p-4 border-b border-gray-100`}>
                <Skeleton width={40} height={40} borderRadius={20} style={tw`mr-4`} />
                <View style={tw`gap-1`}>
                  <Skeleton width={60} height={12} />
                  <Skeleton width={180} height={16} />
                </View>
              </View>
            ))}

            {/* Work Schedule Skeleton */}
            <View style={tw`p-4`}>
              <View style={tw`flex-row items-center mb-3`}>
                <Skeleton width={40} height={40} borderRadius={20} style={tw`mr-4`} />
                <View style={tw`gap-1`}>
                  <Skeleton width={80} height={12} />
                  <Skeleton width={120} height={16} />
                </View>
              </View>
              <View style={tw`bg-gray-50 rounded-xl p-3 ml-14 gap-2`}>
                <Skeleton width={100} height={14} />
                <Skeleton width={150} height={12} />
              </View>
            </View>
          </View>

          {/* Buttons Skeleton */}
          <View style={tw`mt-6 h-14 bg-white rounded-2xl border border-gray-100 items-center justify-center`}>
             <Skeleton width={180} height={20} />
          </View>
          <View style={tw`mt-3 h-14 bg-white rounded-2xl border border-gray-100 items-center justify-center`}>
             <Skeleton width={100} height={20} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
