import { useAuth } from '@/context/AuthContext';
import { ChatConversation, chatService } from '@/services/ChatService';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Globe, MessageCircle, Plus, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface GlobalChat {
    id: string;
    name: string;
    participantCount: number;
}

// Memoized Conversation Item
const ConversationItem = React.memo(({ item, onPress }: { item: ChatConversation, onPress: (id: string) => void }) => {
    const timeAgo = item.lastMessage?.createdAt 
        ? formatDistanceToNow(new Date(item.lastMessage.createdAt), { addSuffix: true, locale: idLocale })
        : '';

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
    const router = useRouter();
    const { user } = useAuth();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [globalChat, setGlobalChat] = useState<GlobalChat | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [convs, global] = await Promise.all([
                chatService.getConversations(),
                chatService.getGlobalChat()
            ]);
            setConversations(convs.filter(c => !c.isGlobal));
            setGlobalChat(global);
        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadData();
            chatService.connectSocket(user.id);
        }

        return () => {
            chatService.disconnect();
        };
    }, [loadData, user?.id]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const handleConversationPress = useCallback((id: string) => {
        router.push(`/(app)/chat/${id}`);
    }, [router]);

    const openNewChat = useCallback(() => {
        router.push('/(app)/chat/new');
    }, [router]);

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

    if (loading) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#9333ea" />
                    <Text style={tw`mt-4 text-gray-500`}>Memuat percakapan...</Text>
                </View>
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
                    renderItem={({ item }: { item: ChatConversation }) => (
                        <ConversationItem item={item} onPress={handleConversationPress} />
                    )}
                    estimatedItemSize={80}
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
