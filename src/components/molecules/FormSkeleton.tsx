import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const FormSkeleton = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      {/* Header Skeleton */}
      <View style={tw`bg-white px-4 py-4 border-b border-gray-100 flex-row items-center`}>
        <Skeleton width={24} height={24} borderRadius={12} style={tw`mr-4`} />
        <Skeleton width={120} height={18} />
      </View>

      <ScrollView style={tw`flex-1`} scrollEnabled={false}>
        <View style={tw`p-4 gap-6`}>
          {/* Form Fields Skeletons */}
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={tw`gap-2`}>
              <Skeleton width={80} height={14} />
              <Skeleton width="100%" height={56} borderRadius={12} />
            </View>
          ))}

          {/* Photo Section Skeleton (Common in many of these forms) */}
          <View style={tw`gap-2`}>
            <Skeleton width={100} height={14} />
            <View style={tw`flex-row gap-3`}>
              <Skeleton width="48%" height={48} borderRadius={12} />
              <Skeleton width="48%" height={48} borderRadius={12} />
            </View>
          </View>

          {/* Submit Button Skeleton */}
          <Skeleton width="100%" height={56} borderRadius={12} style={tw`mt-4`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
