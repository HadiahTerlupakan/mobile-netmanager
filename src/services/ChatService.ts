import { Config } from '@/constants/Config';
import api from '@/services/api'; // Use centralized API
import { uploadService } from '@/services/UploadService';
import { TenantService } from '@/services/TenantService';
import { logger } from '@/utils/logger';
import * as SecureStore from 'expo-secure-store';
import { io, Socket } from 'socket.io-client';

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
    private socket: Socket | null = null;
    private token: string | null = null;

    // Helper for Socket.io only (REST APIs use interceptor)
    private async getToken(): Promise<string | null> {
        if (!this.token) {
            this.token = await SecureStore.getItemAsync('session_token');
        }
        return this.token;
    }

    // Connect to Socket.IO for real-time updates
    async connectSocket(userId: string): Promise<Socket> {
        if (this.socket?.connected) {
            return this.socket;
        }

        const token = await this.getToken();

        this.socket = io(TenantService.getTenantUrl(), {
            path: '/api/socket',
            auth: {
                userId,
                token
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            logger.info('[Chat] Socket connected');
        });

        this.socket.on('disconnect', (reason) => {
            logger.info('[Chat] Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            logger.error('[Chat] Socket connection error:', error);
        });

        return this.socket;
    }

    // Join a conversation room for real-time updates
    joinConversation(conversationId: string) {
        if (this.socket) {
            this.socket.emit('join_room', `chat:${conversationId}`);
            logger.info('[Chat] Joined room:', `chat:${conversationId}`);
        }
    }

    // Leave a conversation room
    leaveConversation(conversationId: string) {
        if (this.socket) {
            this.socket.emit('leave_room', `chat:${conversationId}`);
        }
    }

    // Listen for new messages
    onNewMessage(callback: (message: ChatMessage) => void) {
        if (this.socket) {
            this.socket.on('chat:message', callback);
        }
    }

    // Remove message listener
    offNewMessage() {
        if (this.socket) {
            this.socket.off('chat:message');
        }
    }

    // Disconnect socket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

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
        } catch (error) {
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
