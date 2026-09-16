import { ChatSkeleton } from '@/components/molecules/ChatSkeleton';
import { useAuth } from '@/context/AuthContext';
import { useOfflineQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';
import { ChatConversation, chatService } from '@/services/ChatService';
import { formatTimeAgo } from '@/utils/date';
import { useRouter } from 'expo-router';
import { Globe, MessageCircle, Plus, Users } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

interface GlobalChat {
    id: string;
    name: string;
    participantCount: number;
}

// Memoized Conversation Item
const ConversationItem = React.memo(({ item, onPress }: { item: ChatConversation, onPress: (id: string) => void }) => {
    const timeAgo = formatTimeAgo(item.lastMessage?.createdAt);

    return (
        <TouchableOpacity
            onPress={() => onPress(item.id)}
            style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}
        >
            {/* Avatar */}
            <View style={tw`h-12 w-12 rounded-full bg-purple-100 items-center justify-center`}>
                <MessageCircle size={24} color="#9333ea" />
            </View>

            {/* Content */}
            <View style={tw`flex-1 ml-3`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <Text style={tw`font-semibold text-gray-900 text-base`} numberOfLines={1}>
                        {item.name}
                    </Text>
                    {item.lastMessage && (
                        <Text style={tw`text-xs text-gray-400`}>{timeAgo}</Text>
                    )}
                </View>
                {item.lastMessage && (
                    <Text style={tw`text-sm text-gray-500 mt-1`} numberOfLines={1}>
                        <Text style={tw`font-medium`}>{item.lastMessage.senderName}: </Text>
                        {item.lastMessage.content}
                    </Text>
                )}
            </View>

            {/* Unread indicator */}
            {item.hasUnread && (
                <View style={tw`h-3 w-3 rounded-full bg-purple-500 ml-2`} />
            )}
        </TouchableOpacity>
    );
});
ConversationItem.displayName = 'ConversationItem';

export default function ChatListScreen() {
  useFeatureGuard(AppFeature.CHAT);

    const router = useRouter();
    const { user } = useAuth();

    const {
        data: conversationsData,
        isPending: loadingConversations,
        refetch: refetchConversations,
        isRefetching: refreshingConversations
    } = useOfflineQuery<ChatConversation[]>({
        queryKey: queryKeys.chat.list(),
        queryFn: () => chatService.getConversations(),
        enabled: !!user?.id,
    });

    const {
        data: globalChatData,
        isPending: loadingGlobal,
        refetch: refetchGlobal,
        isRefetching: refreshingGlobal
    } = useOfflineQuery<GlobalChat>({
        queryKey: queryKeys.chat.global(),
        queryFn: () => chatService.getGlobalChat(),
        enabled: !!user?.id,
    });

    const conversations = useMemo(() => {
        const data = conversationsData || [];
        if (!Array.isArray(data)) {
            console.warn('[Chat] conversationsData is not an array:', data);
            return [];
        }
        return data.filter(c => !c.isGlobal);
    }, [conversationsData]);

    const globalChat = globalChatData;
    const loading = loadingConversations || loadingGlobal;
    const refreshing = refreshingConversations || refreshingGlobal;
    const hasData = !!conversationsData && !!globalChatData;


    const onRefresh = useCallback(() => {
        refetchConversations();
        refetchGlobal();
    }, [refetchConversations, refetchGlobal]);

    const handleConversationPress = useCallback((id: string) => {
        router.push(`/(app)/chat/${id}`);
    }, [router]);

    const openNewChat = useCallback(() => {
        router.push('/(app)/chat/new');
    }, [router]);

    // Memoized renderItem to prevent FlashList re-renders
    const renderConversationItem = useCallback(({ item }: { item: ChatConversation }) => (
        <ConversationItem item={item} onPress={handleConversationPress} />
    ), [handleConversationPress]);

    const ListHeader = useMemo(() => {
        if (!globalChat) return null;
        return (
            <TouchableOpacity
                onPress={() => handleConversationPress(globalChat.id)}
                style={tw`flex-row items-center p-4 bg-purple-50 border-b-2 border-purple-200`}
            >
                <View style={tw`h-12 w-12 rounded-full bg-purple-500 items-center justify-center`}>
                    <Globe size={24} color="white" />
                </View>
                <View style={tw`flex-1 ml-3`}>
                    <Text style={tw`font-bold text-purple-900 text-base`}>Global Chat</Text>
                    <View style={tw`flex-row items-center mt-1`}>
                        <Users size={14} color="#7c3aed" />
                        <Text style={tw`text-sm text-purple-700 ml-1`}>
                            {globalChat.participantCount} anggota
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [globalChat, handleConversationPress]);

    if (loading && !refreshing && !hasData) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
                {/* Header */}
                <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
                    <View style={tw`flex-row items-center justify-between`}>
                        <Text style={tw`text-2xl font-bold text-gray-900`}>Chat</Text>
                        <View style={tw`h-10 w-10 rounded-full bg-gray-100`} />
                    </View>
                </View>
                <ChatSkeleton />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <Text style={tw`text-2xl font-bold text-gray-900`}>Chat</Text>
                    <TouchableOpacity
                        onPress={openNewChat}
                        style={tw`h-10 w-10 rounded-full bg-purple-500 items-center justify-center shadow-sm`}
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={tw`flex-1`}>
                <FlashList
                    data={conversations}
                    keyExtractor={(item: ChatConversation) => item.id}
                    renderItem={renderConversationItem}
                    removeClippedSubviews={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#9333ea']}
                            tintColor="#9333ea"
                        />
                    }
                    ListHeaderComponent={ListHeader}
                    ListEmptyComponent={
                        <View style={tw`flex-1 items-center justify-center py-20`}>
                            <MessageCircle size={64} color="#d1d5db" />
                            <Text style={tw`text-gray-400 mt-4 text-center`}>
                                Belum ada percakapan.{'\n'}Tap + untuk memulai chat baru.
                            </Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}
