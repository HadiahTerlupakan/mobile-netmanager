import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const LeaveItemSkeleton = () => {
  return (
    <View style={tw`bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100`}>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View style={tw`gap-1`}>
          <Skeleton width={100} height={14} />
          <Skeleton width={150} height={12} />
        </View>
        <Skeleton width={80} height={24} borderRadius={8} />
      </View>
      <View style={tw`bg-white p-2 rounded-lg`}>
        <Skeleton width="90%" height={14} />
      </View>
    </View>
  );
};

export const LeaveSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {/* Header Skeleton */}
      <View style={tw`bg-teal-600 px-6 pt-6 pb-12 rounded-b-[40px] items-center`}>
         <Skeleton width={120} height={14} style={tw`bg-teal-500 mb-2`} />
         <Skeleton width={150} height={28} style={tw`bg-teal-500`} />
      </View>

      <View style={tw`px-4 -mt-8 mb-4`}>
        <View style={tw`bg-white rounded-2xl shadow-sm p-4 border border-gray-100`}>
          <Skeleton width="100%" height={56} borderRadius={12} style={tw`mb-4`} />
          <View style={tw`flex-row items-center gap-2`}>
            <Skeleton width={18} height={18} borderRadius={4} />
            <Skeleton width={120} height={18} />
          </View>
        </View>
      </View>

      <View style={tw`px-4`}>
        {[1, 2, 3, 4].map((i) => (
          <LeaveItemSkeleton key={i} />
        ))}
      </View>
    </View>
  );
};
