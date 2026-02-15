import { TenantService } from '@/services/TenantService';
import { ChatMessage } from '@/services/ChatService';
import { formatDate } from '@/utils/date';
import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

interface MessageBubbleProps {
    item: ChatMessage;
}

const MessageBubble = React.memo(({ item }: MessageBubbleProps) => {
    const isOwn = item.isOwn;

    const time = formatDate(item.createdAt, 'HH:mm', { fallback: '' });

    const hasImage = !!item.imageUrl;
    const hasText = !!item.content;

    return (
        <View style={tw`px-4 py-1 ${isOwn ? 'items-end' : 'items-start'}`}>
            {!isOwn && (
                <Text style={tw`text-xs text-gray-500 ml-2 mb-1`}>{item.senderName}</Text>
            )}
            <View style={tw`max-w-[80%] ${isOwn ? 'bg-purple-500' : 'bg-white'} rounded-2xl ${hasImage && !hasText ? 'p-1' : 'px-4 py-2'} shadow-sm overflow-hidden`}>
                {hasImage && (
                    <ImageWithCache
                        source={item.imageUrl?.startsWith('http') ? item.imageUrl : `${TenantService.getTenantUrl()}${item.imageUrl}`}
                        style={tw`w-52 h-40 rounded-xl ${hasText ? "mb-2" : ""}`}
                        contentFit="cover"
                        transition={1000}
                    />
                )}
                {hasText && (
                    <Text style={tw`${isOwn ? 'text-white' : 'text-gray-900'}`}>
                        {item.content}
                    </Text>
                )}
                <Text style={tw`text-xs ${isOwn ? 'text-purple-200' : 'text-gray-400'} mt-1 text-right ${hasImage && !hasText ? 'px-2 pb-1' : ''}`}>
                    {time}
                </Text>
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if content, imageUrl, or status changes
    return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.content === nextProps.item.content &&
        prevProps.item.imageUrl === nextProps.item.imageUrl &&
        prevProps.item.createdAt === nextProps.item.createdAt
    );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
