import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSubscribeToScope = jest.fn();
const mockEmitToRoom = jest.fn();

jest.mock('@/services/RealtimeService', () => ({
  realtimeService: {
    subscribeToScope: mockSubscribeToScope,
    emitToRoom: mockEmitToRoom,
  },
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    chat: {
      messages: (conversationId: string) => ['chat', 'messages', conversationId],
      list: () => ['chat', 'list'],
    },
  },
}));

jest.mock('@/constants/features', () => ({
  AppFeature: {
    CHAT: 'chat',
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ conversationId: 'conv-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Admin' } }),
}));

jest.mock('@/hooks/queries/useApiMutation', () => ({
  useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
  isOfflineMutationQueuedResult: () => false,
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  }),
  useInfiniteQuery: () => ({
    data: {
      pages: [
        {
          conversation: { id: 'conv-1', name: 'Chat', participants: [] },
          messages: [],
          nextCursor: null,
        },
      ],
    },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isPending: false,
  }),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/services/ChatService', () => ({
  chatService: {
    connectSocket: jest.fn(() => Promise.resolve(null)),
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    onNewMessage: jest.fn(),
    onTyping: jest.fn(),
    onStopTyping: jest.fn(),
    offNewMessage: jest.fn(),
    sendTyping: jest.fn(),
    sendStopTyping: jest.fn(),
  },
}));

jest.mock('@/components/atoms/Skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/molecules/ConversationSkeleton', () => ({ ConversationSkeleton: () => null }));
jest.mock('@/components/molecules/MessageBubble', () => 'MessageBubble');
jest.mock('@/components/atoms/ImageWithCache', () => ({ ImageWithCache: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Image: 'ImageIcon',
  Send: 'Send',
  X: 'X',
}));
jest.mock('twrnc', () => () => ({}));

describe('mobile chat conversation realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes through realtime scope handling instead of socket room helpers', async () => {
    const ConversationScreen = require('../../app/(app)/chat/[conversationId]').default;

    render(<ConversationScreen />);

    await waitFor(() => {
      expect(mockSubscribeToScope).toHaveBeenCalledWith(
        { kind: 'chat', id: 'conv-1' },
        expect.any(Function)
      );
    });
  });

  it('emits typing through realtime room emission instead of socket emit helpers', async () => {
    jest.useFakeTimers();

    const ConversationScreen = require('../../app/(app)/chat/[conversationId]').default;
    const { getByPlaceholderText } = render(<ConversationScreen />);

    const input = getByPlaceholderText('Ketik pesan...');

    fireEvent.changeText(input, 'halo');

    expect(mockEmitToRoom).toHaveBeenCalledWith(
      'chat:conv-1',
      'chat:typing',
      { room: 'chat:conv-1', senderName: 'Admin' }
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockEmitToRoom).toHaveBeenCalledWith(
      'chat:conv-1',
      'chat:stop_typing',
      { room: 'chat:conv-1' }
    );

    jest.useRealTimers();
  });
});
