import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const UserItemSkeleton = () => {
  return (
    <View style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={tw`flex-1 ml-3 gap-2`}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="70%" height={12} />
      </View>
      <Skeleton width={24} height={24} borderRadius={12} />
    </View>
  );
};

export const UserListSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <UserItemSkeleton key={i} />
      ))}
    </View>
  );
};
