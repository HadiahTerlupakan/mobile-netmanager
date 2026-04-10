import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

import { chatService } from '@/services/ChatService';

jest.mock('@/constants/features', () => ({
  AppFeature: {
    CHAT: 'chat',
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useFeatureGuard', () => ({
  useFeatureGuard: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Admin' } }),
}));

jest.mock('@/hooks/queries', () => ({
  useOfflineQuery: jest.fn(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey.includes('global')) {
      return {
        data: { id: 'global-1', name: 'Global Chat', participantCount: 2 },
        isPending: false,
        refetch: jest.fn(),
        isRefetching: false,
      };
    }

    return {
      data: [],
      isPending: false,
      refetch: jest.fn(),
      isRefetching: false,
    };
  }),
}));

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    chat: {
      list: () => ['chat', 'list'],
      global: () => ['chat', 'global'],
    },
  },
}));

jest.mock('@/services/ChatService', () => ({
  chatService: {
    connectSocket: jest.fn(() => Promise.resolve(null)),
    disconnect: jest.fn(),
    getConversations: jest.fn(),
    getGlobalChat: jest.fn(),
  },
}));

jest.mock('@/components/molecules/ChatSkeleton', () => ({ ChatSkeleton: () => null }));
jest.mock('@shopify/flash-list', () => ({ FlashList: 'FlashList' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('lucide-react-native', () => ({
  Globe: 'Globe',
  MessageCircle: 'MessageCircle',
  Plus: 'Plus',
  Users: 'Users',
}));
jest.mock('twrnc', () => () => ({}));

const mockChatService = chatService as unknown as Record<string, jest.Mock>;

describe('mobile chat list realtime boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not own socket lifecycle through chatService', () => {
    const ChatListScreen = require('../../app/(app)/chat/index').default;

    render(<ChatListScreen />);

    expect(mockChatService.connectSocket).not.toHaveBeenCalled();
    expect(mockChatService.disconnect).not.toHaveBeenCalled();
  });
});
