import MessageBubble from '@/components/molecules/MessageBubble';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage, chatService, ChatConversation } from '@/services/ChatService';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, Send, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function ConversationScreen() {
    const router = useRouter();
    const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
    const { user } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversation, setConversation] = useState<ChatConversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);

    const flashListRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    const loadMessages = useCallback(async (cursor?: string) => {
        if (!conversationId) return;

        try {
            const result = await chatService.getMessages(conversationId, cursor);
            setConversation(result.conversation);

            if (cursor) {
                setMessages(prev => [...prev, ...result.messages]);
            } else {
                setMessages(result.messages.reverse());
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        loadMessages();

        if (user?.id && conversationId) {
            chatService.connectSocket(user.id).then(() => {
                chatService.joinConversation(conversationId);
            });

            chatService.onNewMessage((message) => {
                setMessages(prev => [...prev, message]);
                setTimeout(() => {
                    flashListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            });
        }

        return () => {
            if (conversationId) {
                chatService.leaveConversation(conversationId);
            }
            chatService.offNewMessage();
        };
    }, [conversationId, loadMessages, user?.id]);

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
        if ((!newMessage.trim() && !selectedImage) || !conversationId || sending) return;

        const messageContent = newMessage.trim();
        const imageToSend = selectedImage;

        setNewMessage('');
        setSelectedImage(null);
        setSending(true);

        try {
            let imageUrl: string | undefined;

            // Upload image first if selected
            if (imageToSend) {
                setUploading(true);
                imageUrl = await chatService.uploadImage(imageToSend);
                setUploading(false);
            }

            const sentMessage = await chatService.sendMessage(
                conversationId,
                messageContent || undefined,
                imageUrl
            );
            setMessages(prev => [...prev, sentMessage]);

            setTimeout(() => {
                flashListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(messageContent);
            setSelectedImage(imageToSend);
            Alert.alert('Error', 'Gagal mengirim pesan. Coba lagi.');
        } finally {
            setSending(false);
            setUploading(false);
        }
    };

    const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
        return <MessageBubble item={item} />;
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#9333ea" />
                </View>
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
                    onContentSizeChange={() => {
                        if (messages.length > 0) {
                            flashListRef.current?.scrollToEnd({ animated: false });
                        }
                    }}
                    ListEmptyComponent={
                        <View style={tw`flex-1 items-center justify-center py-20`}>
                            <Text style={tw`text-gray-400`}>Belum ada pesan</Text>
                            <Text style={tw`text-gray-400 text-sm`}>Mulai percakapan!</Text>
                        </View>
                    }
                />

                {/* Image Preview */}
                {selectedImage && (
                    <View style={tw`bg-white px-4 py-2 border-t border-gray-200`}>
                        <View style={tw`relative`}>
                            <Image source={{ uri: selectedImage }} style={tw`w-20 h-20 rounded-lg`} contentFit="cover" transition={1000}      />
                            <TouchableOpacity
                                onPress={() => setSelectedImage(null)}
                                style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1`}
                            >
                                <X size={14} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Input */}
                <View style={[tw`bg-white px-4 py-3 border-t border-gray-200`, { paddingBottom: 12 + insets.bottom }]}>
                    <View style={tw`flex-row items-end`}>
                        {/* Attachment Button */}
                        <TouchableOpacity
                            onPress={pickImage}
                            disabled={sending}
                            style={tw`h-11 w-11 rounded-full items-center justify-center bg-gray-100 mr-2`}
                        >
                            <ImageIcon size={22} color="#6b7280" />
                        </TouchableOpacity>

                        <TextInput
                            style={tw`flex-1 bg-gray-100 rounded-full px-4 py-3 mr-2 max-h-24`}
                            placeholder="Ketik pesan..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                            maxLength={1000}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={(!newMessage.trim() && !selectedImage) || sending}
                            style={tw`h-11 w-11 rounded-full items-center justify-center ${
                                (newMessage.trim() || selectedImage) && !sending ? 'bg-purple-500' : 'bg-gray-300'
                            }`}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Send size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                    {uploading && (
                        <Text style={tw`text-xs text-purple-600 text-center mt-2`}>
                            Mengupload gambar...
                        </Text>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
