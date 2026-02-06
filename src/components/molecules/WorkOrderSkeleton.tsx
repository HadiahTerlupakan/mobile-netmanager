import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const WorkOrderListItemSkeleton = () => {
  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100`}>
      {/* Header: Number & Status */}
      <View style={tw`flex-row justify-between items-center mb-2`}>
        <Skeleton width={100} height={16} />
        <Skeleton width={60} height={20} borderRadius={10} />
      </View>

      {/* Title & Priority */}
      <Skeleton width="80%" height={20} style={tw`mb-2`} />
      <View style={tw`flex-row items-center mb-3`}>
        <Skeleton width={12} height={12} borderRadius={6} style={tw`mr-1`} />
        <Skeleton width={40} height={12} />
      </View>

      {/* Phone */}
      <View style={tw`flex-row items-center mb-1`}>
        <Skeleton width={14} height={14} borderRadius={7} style={tw`mr-1.5`} />
        <Skeleton width={120} height={14} />
      </View>

      {/* Customer & Location */}
      <View style={tw`flex-row items-center mb-1`}>
        <Skeleton width={14} height={14} borderRadius={7} style={tw`mr-1.5`} />
        <Skeleton width="90%" height={14} />
      </View>

      {/* Date */}
      <View style={tw`flex-row items-center mt-1`}>
        <Skeleton width={14} height={14} borderRadius={7} style={tw`mr-1.5`} />
        <Skeleton width={150} height={12} />
      </View>
    </View>
  );
};

export const WorkOrderSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <WorkOrderListItemSkeleton key={i} />
      ))}
    </View>
  );
};
