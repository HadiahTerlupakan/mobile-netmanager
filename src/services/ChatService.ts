import api from '@/services/api'; // Use centralized API
import { uploadService } from '@/services/UploadService';
import { logger } from '@/utils/logger';

// Types
export interface ChatUser {
    id: string;
    name: string;
    email?: string;
    image?: string;
    department?: string;
    site?: string;
}

export interface ChatMessage {
    id: string;
    content: string | null;
    imageUrl?: string | null;
    senderId: string;
    senderName: string;
    senderImage?: string;
    createdAt: string;
    isOwn: boolean;
}

export interface ChatConversation {
    id: string;
    name: string;
    isGlobal: boolean;
    participants: ChatUser[];
    lastMessage?: {
        content: string;
        senderName: string;
        createdAt: string;
    };
    hasUnread: boolean;
    updatedAt: string;
}

// API Service
class ChatService {
    // Get all conversations
    async getConversations(): Promise<ChatConversation[]> {
        try {
            const response = await api.get('/api/mobile/chat/conversations');
            const data = response.data.data;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            logger.error('[Chat] Error fetching conversations:', error);
            throw error;
        }
    }

    // Get or create global chat
    async getGlobalChat(): Promise<{ id: string; name: string; participantCount: number }> {
        try {
            const response = await api.get('/api/mobile/chat/global');
            return response.data.data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                logger.info('[Chat] Chat feature is not available for this user');
                return { id: '', name: 'Not Available', participantCount: 0 };
            }
            logger.error('[Chat] Error getting global chat:', error);
            throw error;
        }
    }

    // Get messages for a conversation
    async getMessages(conversationId: string, cursor?: string): Promise<{
        conversation: ChatConversation;
        messages: ChatMessage[];
        hasMore: boolean;
        nextCursor: string | null;
    }> {
        try {
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            params.append('limit', '50');

            const response = await api.get(`/api/mobile/chat/conversations/${conversationId}?${params.toString()}`);
            return response.data.data;
        } catch (error) {
            logger.error('[Chat] Error fetching messages:', error);
            throw error;
        }
    }

    // Send a message (text and/or image)
    async sendMessage(conversationId: string, content?: string, imageUrl?: string): Promise<ChatMessage> {
        try {
            const response = await api.post(
                `/api/mobile/chat/conversations/${conversationId}`,
                { content, imageUrl }
            );
            return response.data.data;
        } catch (error) {
            logger.error('[Chat] Error sending message:', error);
            throw error;
        }
    }

    // Upload image and return URL
    async uploadImage(imageUri: string): Promise<string> {
        try {
            const response = await uploadService.uploadCustom(imageUri, '/api/mobile/chat/upload', {
                fieldName: 'image'
            });
            return response.data.imageUrl;
        } catch (error) {
            logger.error('[Chat] Error uploading image:', error);
            throw error;
        }
    }

    // Get users for new chat
    async getUsers(search?: string): Promise<ChatUser[]> {
        try {
            const params = search ? `?search=${encodeURIComponent(search)}` : '';
            const response = await api.get(`/api/mobile/chat/users${params}`);
            const data = response.data.data;
            return Array.isArray(data) ? data : [];
        } catch (error) {
            logger.error('[Chat] Error fetching users:', error);
            throw error;
        }
    }

    // Create new conversation
    async createConversation(participantIds: string[], name?: string): Promise<{ id: string; isExisting: boolean }> {
        try {
            const response = await api.post(
                '/api/mobile/chat/conversations',
                { participantIds, name }
            );
            return response.data.data;
        } catch (error) {
            logger.error('[Chat] Error creating conversation:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
