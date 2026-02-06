import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const TransactionItemSkeleton = () => {
  return (
    <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-100 flex-row items-center`}>
      <Skeleton width={40} height={40} borderRadius={10} style={tw`mr-3`} />
      <View style={tw`flex-1 gap-1`}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </View>
      <View style={tw`items-end gap-1`}>
        <Skeleton width={50} height={16} />
        <Skeleton width={40} height={10} />
      </View>
    </View>
  );
};

export const InventorySkeleton = () => {
  return (
    <View style={tw`flex-1 px-4`}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <TransactionItemSkeleton key={i} />
      ))}
    </View>
  );
};
