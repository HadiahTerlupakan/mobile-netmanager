import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const OvertimeItemSkeleton = () => {
  return (
    <View style={tw`bg-white p-4 rounded-xl mb-2 flex-row justify-between items-center border border-gray-100`}>
      <View style={tw`flex-1 mr-3 gap-2`}>
        <Skeleton width={80} height={14} />
        <Skeleton width="100%" height={12} />
      </View>
      <Skeleton width={60} height={20} borderRadius={4} />
    </View>
  );
};

export const OvertimeSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {/* Header Skeleton */}
      <View style={tw`bg-indigo-600 px-6 pt-6 pb-12 rounded-b-[40px] items-center`}>
        <Skeleton width={150} height={14} style={tw`bg-indigo-500 mb-2`} />
        <Skeleton width={120} height={40} style={tw`bg-indigo-500`} />
      </View>

      <View style={tw`px-4 -mt-8`}>
        <View style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}>
          {/* Location Skeleton */}
          <View style={tw`flex-row items-center bg-gray-50 p-3 rounded-xl mb-4`}>
            <Skeleton width={36} height={36} borderRadius={18} style={tw`mr-3`} />
            <View style={tw`flex-1 gap-1`}>
              <Skeleton width={80} height={10} />
              <Skeleton width="90%" height={14} />
            </View>
          </View>

          {/* Action Card Skeleton */}
          <View style={tw`bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl h-32 items-center justify-center mb-4`}>
            <Skeleton width={32} height={32} borderRadius={4} style={tw`mb-2`} />
            <Skeleton width={100} height={14} />
            <Skeleton width={120} height={10} style={tw`mt-1`} />
          </View>
        </View>

        <Skeleton width={120} height={20} style={tw`mt-4 mb-3`} />

        {[1, 2, 3, 4].map((i) => (
          <OvertimeItemSkeleton key={i} />
        ))}
      </View>
    </View>
  );
};
