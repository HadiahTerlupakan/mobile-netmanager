import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const NotificationItemSkeleton = () => {
  return (
    <View style={tw`flex-row p-4 border-b border-gray-100 bg-white`}>
      <Skeleton width={40} height={40} borderRadius={20} style={tw`mr-3`} />
      <View style={tw`flex-1 gap-2`}>
        <View style={tw`flex-row justify-between items-center`}>
          <Skeleton width="60%" height={16} />
          <Skeleton width={10} height={10} borderRadius={5} />
        </View>
        <Skeleton width="90%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
};

export const NotificationSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </View>
  );
};
