import { Skeleton } from '@/components/atoms/Skeleton';
import { ConversationSkeleton } from '@/components/molecules/ConversationSkeleton';
import MessageBubble from '@/components/molecules/MessageBubble';
import { useAuth } from '@/context/AuthContext';
import { isOfflineMutationQueuedResult, useApiMutation } from '@/hooks/queries/useApiMutation';
import { queryKeys } from '@/lib/queryClient';
import { ChatMessage, chatService } from '@/services/ChatService';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/services/api';
import { ArrowLeft, Image as ImageIcon, Send, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

export default function ConversationScreen() {
    useFeatureGuard(AppFeature.CHAT);

    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const flashListRef = useRef<any>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const insets = useSafeAreaInsets();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isPending: loading,
    } = useInfiniteQuery({
        queryKey: queryKeys.chat.messages(conversationId),
        queryFn: async ({ pageParam = null }) => {
            const params = new URLSearchParams();
            params.append('limit', '20');
            if (pageParam) {
                params.append('cursor', pageParam as string);
            }
            const res = await api.get(`/api/mobile/chat/conversations/${conversationId}?${params.toString()}`);
            return res.data.data;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
        initialPageParam: null,
        enabled: !!conversationId,
        // Inverted chat needs newest first, which API provides.
        // We rely on cache heavily for chat.
        staleTime: Infinity,
    });

    const messages = useMemo(() => {
        // Flatten pages. API returns newest first.
        // We want [Newest, ..., Oldest] for Inverted List.
        return data?.pages.flatMap((page) => page.messages) || [];
    }, [data]);

    const conversation = data?.pages[0]?.conversation;

    const sendMessageMutation = useApiMutation({
        endpoint: `/api/mobile/chat/conversations/${conversationId}`,
        method: 'POST',
        onSuccess: (response: any) => {
            if (isOfflineMutationQueuedResult(response)) {
                return;
            }

            const responseData = response.data || response;
            const sentMessage = {
                ...responseData,
                isOwn: true
            };

            // Optimistically update the cache
            queryClient.setQueryData(queryKeys.chat.messages(conversationId), (oldData: any) => {
                if (!oldData) return oldData;

                const newPages = [...oldData.pages];
                const firstPage = { ...newPages[0] };
                const existingMessages = [...firstPage.messages];

                // Check if message already exists (from socket race condition)
                const existingIndex = existingMessages.findIndex((m: ChatMessage) => m.id === sentMessage.id);

                if (existingIndex !== -1) {
                    // Update existing message
                    existingMessages[existingIndex] = sentMessage;
                } else {
                    // Add new message
                    existingMessages.unshift(sentMessage);
                }

                firstPage.messages = existingMessages;
                newPages[0] = firstPage;

                return {
                    ...oldData,
                    pages: newPages
                };
            });

            // Also invalidate conversation list to update last message
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.list() });

            setNewMessage('');
            setSelectedImage(null);

            // Scroll to bottom
            setTimeout(() => {
                flashListRef.current?.scrollToIndex({ index: 0, animated: true });
            }, 100);
        }
    });

    useEffect(() => {
        if (user?.id && conversationId) {
            chatService.connectSocket(user.id).then(() => {
                chatService.joinConversation(conversationId);
            });

            chatService.onNewMessage((message) => {
                // Ensure isOwn is correctly set for socket messages
                const incomingMessage = {
                    ...message,
                    isOwn: message.senderId === user.id
                };

                queryClient.setQueryData(queryKeys.chat.messages(conversationId), (oldData: any) => {
                    if (!oldData) return oldData;

                    const newPages = [...oldData.pages];
                    const firstPage = { ...newPages[0] };
                    const existingMessages = [...firstPage.messages];

                    // Check for duplicates
                    const existingIndex = existingMessages.findIndex((m: ChatMessage) => m.id === incomingMessage.id);

                    if (existingIndex !== -1) {
                        // If it exists, we might want to update it, but typically optimistic update is more trusted for own messages
                        // unless this is a confirmation from server with more data.
                        // For now, if we sent it, we keep our version or merge if needed.
                        // But strictly speaking, if socket comes, we should display it.
                        return oldData;
                    }

                    // Add new message
                    existingMessages.unshift(incomingMessage);

                    firstPage.messages = existingMessages;
                    newPages[0] = firstPage;

                    return {
                        ...oldData,
                        pages: newPages
                    };
                });

                queryClient.invalidateQueries({ queryKey: queryKeys.chat.list() });
            });

            chatService.onTyping((data) => {
                if (data.userId !== user.id) {
                    setTypingUsers((prev) => {
                        if (!prev.includes(data.senderName)) {
                            return [...prev, data.senderName];
                        }
                        return prev;
                    });
                }
            });

            chatService.onStopTyping((data) => {
                if (data.userId !== user.id) {
                    // Mencegah memory leak dan menjaga state sinkron dengan senderName, kita perlu mapping
                    // Tapi karena hanya string, kita biarkan saja timer dari client-side yang handle
                    setTypingUsers([]);
                }
            });
        }

        return () => {
            if (conversationId) {
                chatService.leaveConversation(conversationId);
            }
            chatService.offNewMessage();
        };
    }, [conversationId, user?.id, queryClient]);

    const handleTextChange = (text: string) => {
        setNewMessage(text);

        if (conversationId) {
            chatService.sendTyping(conversationId, user?.name);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                chatService.sendStopTyping(conversationId);
            }, 2000);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Izin Diperlukan', 'Aplikasi memerlukan akses ke galeri foto.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleSend = async () => {
        if ((!newMessage.trim() && !selectedImage) || !conversationId || sendMessageMutation.isPending) return;

        const messageContent = newMessage.trim();
        const imageToSend = selectedImage;

        // Optimistic UI update could be added here for even faster feel
        // For now relying on onSuccess or Socket event

        sendMessageMutation.mutate({
            content: messageContent || undefined,
            meta: imageToSend ? {
                photoMap: { imageUrl: imageToSend },
                photoType: 'chat'
            } : undefined
        });
    };

    const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
        return <MessageBubble item={item} />;
    }, []);

    const onLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    if (loading && !data) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
                <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View style={tw`flex-1 ml-2 gap-1`}>
                        <Skeleton width={120} height={18} />
                        <Skeleton width={60} height={12} />
                    </View>
                </View>
                <ConversationSkeleton />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-100`} edges={['top']}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-200 shadow-sm`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View style={tw`flex-1 ml-2`}>
                    <Text style={tw`font-bold text-gray-900 text-lg`} numberOfLines={1}>
                        {conversation?.name || 'Chat'}
                    </Text>
                    {conversation?.participants && (
                        <Text style={tw`text-xs text-gray-500`}>
                            {conversation.participants.length} peserta
                        </Text>
                    )}
                </View>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={tw`flex-1`}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <FlashList
                    ref={flashListRef}
                    data={messages}
                    keyExtractor={(item: ChatMessage) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={tw`py-4`}
                    estimatedItemSize={80}
                    inverted // Inverted list for chat
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={
                        <View style={tw`flex-1 items-center justify-center py-20 transform scale-y-[-1]`}>
                            <Text style={tw`text-gray-400`}>Belum ada pesan</Text>
                            <Text style={tw`text-gray-400 text-sm`}>Mulai percakapan!</Text>
                        </View>
                    }
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View style={tw`py-4 items-center`}>
                                <ActivityIndicator size="small" color="#2563eb" />
                            </View>
                        ) : null
                    }
                />

                {/* Image Preview */}
                {selectedImage && (
                    <View style={tw`bg-white px-4 py-2 border-t border-gray-200`}>
                        <View style={tw`relative`}>
                            <ImageWithCache source={selectedImage} style={tw`w-20 h-20 rounded-lg`} contentFit="cover" transition={1000} />
                            <TouchableOpacity
                                onPress={() => setSelectedImage(null)}
                                style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1`}
                            >
                                <X size={14} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <View style={tw`px-4 py-1 bg-white border-t border-gray-100`}>
                        <Text style={tw`text-xs text-gray-400 italic`}>
                            {typingUsers.join(', ')} sedang mengetik...
                        </Text>
                    </View>
                )}

                {/* Input */}
                <View style={[tw`bg-white px-4 py-3 border-t border-gray-200`, { paddingBottom: 12 + insets.bottom }]}>
                    <View style={tw`flex-row items-end`}>
                        {/* Attachment Button */}
                        <TouchableOpacity
                            onPress={pickImage}
                            disabled={sendMessageMutation.isPending}
                            style={tw`h-11 w-11 rounded-full items-center justify-center bg-gray-100 mr-2`}
                        >
                            <ImageIcon size={22} color="#6b7280" />
                        </TouchableOpacity>

                        <TextInput
                            style={tw`flex-1 bg-gray-100 rounded-full px-4 py-3 mr-2 max-h-24`}
                            placeholder="Ketik pesan..."
                            value={newMessage}
                            onChangeText={handleTextChange}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={(!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending}
                            style={tw`h-11 w-11 rounded-full items-center justify-center ${(newMessage.trim() || selectedImage) && !sendMessageMutation.isPending ? 'bg-purple-500' : 'bg-gray-300'
                                }`}
                        >
                            {sendMessageMutation.isPending ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Send size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
