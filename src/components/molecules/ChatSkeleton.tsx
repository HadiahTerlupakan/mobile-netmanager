import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const ConversationItemSkeleton = () => {
  return (
    <View style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={tw`flex-1 ml-3 gap-2`}>
        <View style={tw`flex-row items-center justify-between`}>
          <Skeleton width="40%" height={16} />
          <Skeleton width={60} height={12} />
        </View>
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  );
};

export const ChatSkeleton = () => {
  return (
    <View style={tw`flex-1`}>
      {/* Global Chat Skeleton */}
      <View style={tw`flex-row items-center p-4 bg-purple-50 border-b-2 border-purple-100`}>
        <Skeleton width={48} height={48} borderRadius={24} style={tw`bg-purple-200`} />
        <View style={tw`flex-1 ml-3 gap-2`}>
          <Skeleton width={100} height={18} style={tw`bg-purple-200`} />
          <Skeleton width={80} height={14} style={tw`bg-purple-200`} />
        </View>
      </View>

      {/* Conversation List Skeleton */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <ConversationItemSkeleton key={i} />
      ))}
    </View>
  );
};
