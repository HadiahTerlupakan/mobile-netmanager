import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * Urutan pesan di layar percakapan.
 *
 * FlashList v2 tidak lagi mengenal `inverted`; prop itu dihapus di 19af0c0
 * supaya empty state tidak tampil terbalik, tetapi datanya tetap disusun
 * terbaru-dulu "untuk daftar terbalik". Akibatnya pesan terbaru muncul di
 * puncak layar sementara kolom ketik ada di bawah — terlihat di QA persona
 * STAFF. Berkas ini mengunci pola penggantinya: data kronologis plus
 * `maintainVisibleContentPosition`, dan pesan lama dimuat dari awal daftar.
 */

const propsFlashList: Record<string, unknown>[] = [];

jest.mock('@shopify/flash-list', () => ({
  FlashList: (props: Record<string, unknown>) => {
    propsFlashList.push(props);
    return null;
  },
}));

const PESAN_SERVER_TERBARU_DULU = [
  { id: 'm3', content: 'paling baru', createdAt: '2026-10-11T06:28:00Z' },
  { id: 'm2', content: 'tengah', createdAt: '2026-10-11T06:27:00Z' },
  { id: 'm1', content: 'paling lama', createdAt: '2026-10-10T15:40:00Z' },
];

jest.mock('@/lib/queryClient', () => ({
  queryKeys: {
    chat: {
      messages: (conversationId: string) => ['chat', 'messages', conversationId],
      list: () => ['chat', 'list'],
    },
  },
}));
jest.mock('@/constants/features', () => ({ AppFeature: { CHAT: 'chat' } }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ conversationId: 'conv-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock('@/hooks/useFeatureGuard', () => ({ useFeatureGuard: jest.fn() }));
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Siti Nurhaliza' } }),
}));
jest.mock('@/hooks/queries/useApiMutation', () => ({
  useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
  isOfflineMutationQueuedResult: () => false,
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() }),
  useInfiniteQuery: () => ({
    data: {
      pages: [
        {
          conversation: { id: 'conv-1', name: 'Global Chat', participants: [] },
          messages: PESAN_SERVER_TERBARU_DULU,
          nextCursor: null,
        },
      ],
    },
    fetchNextPage: jest.fn(),
    hasNextPage: true,
    isFetchingNextPage: false,
    isPending: false,
  }),
}));
jest.mock('@/services/RealtimeService', () => ({
  realtimeService: { subscribeToScope: jest.fn(), emitToRoom: jest.fn() },
}));
jest.mock('@/services/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
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
jest.mock('twrnc', () => require('twrnc-kosong'));

const flashList = () => {
  const terakhir = propsFlashList[propsFlashList.length - 1];
  if (!terakhir) throw new Error('FlashList tidak pernah dirender');
  return terakhir;
};

describe('urutan pesan layar percakapan', () => {
  beforeEach(() => {
    propsFlashList.length = 0;
    jest.clearAllMocks();
    const ConversationScreen = require('../../app/(app)/chat/[conversationId]').default;
    render(<ConversationScreen />);
  });

  it('menyusun pesan kronologis meski server mengirim terbaru dulu', () => {
    const urutan = (flashList().data as { id: string }[]).map((m) => m.id);
    expect(urutan).toEqual(['m1', 'm2', 'm3']);
  });

  it('merender dari bawah supaya pesan terbaru menempel ke kolom ketik', () => {
    expect(flashList().maintainVisibleContentPosition).toMatchObject({
      startRenderingFromBottom: true,
    });
  });

  // Pesan lama kini ada di atas; memuatnya dari akhir daftar akan memuat
  // ulang riwayat justru saat pengguna menatap pesan terbaru.
  it('memuat pesan lama dari awal daftar, bukan dari akhir', () => {
    expect(typeof flashList().onStartReached).toBe('function');
    expect(flashList().onEndReached).toBeUndefined();
  });
});
