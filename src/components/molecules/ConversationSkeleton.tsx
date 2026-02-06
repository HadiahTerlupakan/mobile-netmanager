import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/components/atoms/Skeleton';
import tw from 'twrnc';

export const MessageBubbleSkeleton = ({ isMe = false }: { isMe?: boolean }) => {
  return (
    <View style={tw`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'} px-4`}>
      {!isMe && (
        <Skeleton width={32} height={32} borderRadius={16} style={tw`mr-2 self-end mb-1`} />
      )}
      <View style={tw`max-w-[80%] gap-1`}>
        <Skeleton
          width={isMe ? 200 : 180}
          height={40}
          borderRadius={16}
          style={tw`${isMe ? 'bg-purple-200' : 'bg-gray-200'}`}
        />
        <Skeleton width={60} height={10} style={tw`${isMe ? 'self-end' : 'self-start'}`} />
      </View>
    </View>
  );
};

export const ConversationSkeleton = () => {
  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <View style={tw`flex-1 py-4`}>
        <MessageBubbleSkeleton isMe={false} />
        <MessageBubbleSkeleton isMe={true} />
        <MessageBubbleSkeleton isMe={false} />
        <MessageBubbleSkeleton isMe={false} />
        <MessageBubbleSkeleton isMe={true} />
        <MessageBubbleSkeleton isMe={false} />
      </View>
    </View>
  );
};
