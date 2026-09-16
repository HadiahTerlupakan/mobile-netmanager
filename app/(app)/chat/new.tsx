import { UserListSkeleton } from '@/components/molecules/UserListSkeleton';
import { useApiMutation } from '@/hooks/queries/useApiMutation';
import { useApiQuery } from '@/hooks/queries/useApiQuery';
import { queryKeys } from '@/lib/queryClient';
import { chatService, ChatUser } from '@/services/ChatService';
import { CreateConversationSchema, validateData } from '@/utils/validation';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Search, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useFeatureGuard } from '@/hooks/useFeatureGuard';
import { AppFeature } from '@/constants/features';

// Memoized User Item
const UserItem = React.memo(({ item, isSelected, onToggle }: { item: ChatUser, isSelected: boolean, onToggle: (id: string) => void }) => {
    return (
        <TouchableOpacity
            onPress={() => onToggle(item.id)}
            style={tw`flex-row items-center p-4 bg-white border-b border-gray-100 ${isSelected ? 'bg-purple-50' : ''}`}
        >
            {/* Avatar */}
            <View style={tw`h-12 w-12 rounded-full bg-gray-200 items-center justify-center`}>
                <User size={24} color="#6b7280" />
            </View>

            {/* Info */}
            <View style={tw`flex-1 ml-3`}>
                <Text style={tw`font-semibold text-gray-900`}>{item.name || 'Unknown'}</Text>
                {(item.department || item.site) && (
                    <Text style={tw`text-sm text-gray-500`}>
                        {[item.department, item.site].filter(Boolean).join(' • ')}
                    </Text>
                )}
            </View>

            {/* Selection indicator */}
            <View style={tw`h-6 w-6 rounded-full border-2 items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                }`}>
                {isSelected && <Check size={14} color="white" />}
            </View>
        </TouchableOpacity>
    );
});
UserItem.displayName = 'UserItem';

export default function NewChatScreen() {
  useFeatureGuard(AppFeature.CHAT);

    const router = useRouter();

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data: usersData, isPending: loading } = useApiQuery<ChatUser[]>({
        queryKey: queryKeys.chat.users(debouncedSearch),
        queryFn: () => chatService.getUsers(debouncedSearch),
    });

    const users = usersData || [];

    const createConversationMutation = useApiMutation({
        endpoint: '/api/mobile/chat/conversations',
        method: 'POST',
        invalidateKeys: [queryKeys.chat.list()],
        onSuccess: (response: any) => {
            const data = response.data || response;
            if (data?.id) {
                router.replace(`/(app)/chat/${data.id}`);
            }
        }
    });

    const toggleUser = useCallback((userId: string) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            }
            return [...prev, userId];
        });
    }, []);

    const handleCreateChat = useCallback(async () => {
        if (selectedUsers.length === 0 || createConversationMutation.isPending) return;

        const validation = validateData(CreateConversationSchema, { participantIds: selectedUsers });
        if (!validation.success) {
            // Should not happen due to UI check, but good for safety
            return;
        }

        createConversationMutation.mutate(validation.data);
    }, [selectedUsers, createConversationMutation]);

    const ListEmpty = useMemo(() => (
        <View style={tw`flex-1 items-center justify-center py-20`}>
            <User size={48} color="#d1d5db" />
            <Text style={tw`text-gray-400 mt-4`}>
                {searchQuery ? 'Tidak ada user ditemukan' : 'Tidak ada user tersedia'}
            </Text>
        </View>
    ), [searchQuery]);

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
            {/* Header */}
            <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center`}>
                        <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                            <ArrowLeft size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={tw`font-bold text-gray-900 text-lg ml-2`}>Chat Baru</Text>
                    </View>

                    {selectedUsers.length > 0 && (
                        <TouchableOpacity
                            onPress={handleCreateChat}
                            disabled={createConversationMutation.isPending}
                            style={tw`px-4 py-2 bg-purple-500 rounded-full ${createConversationMutation.isPending ? 'opacity-50' : ''}`}
                        >
                            {createConversationMutation.isPending ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={tw`text-white font-semibold`}>
                                    Mulai ({selectedUsers.length})
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search */}
            <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
                <View style={tw`flex-row items-center bg-gray-100 rounded-full px-4 py-2`}>
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        style={tw`flex-1 ml-2 text-base h-10`}
                        placeholder="Cari nama atau email..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {/* Selected users preview */}
            {selectedUsers.length > 0 && (
                <View style={tw`bg-purple-50 px-4 py-2`}>
                    <Text style={tw`text-purple-700 text-sm`}>
                        {selectedUsers.length} user dipilih
                    </Text>
                </View>
            )}

            {/* User list */}
            {loading && !usersData ? (
                <UserListSkeleton />
            ) : (
                <View style={tw`flex-1`}>
                    <FlashList
                        data={users}
                        keyExtractor={(item: ChatUser) => item.id}
                        renderItem={({ item }: { item: ChatUser }) => (
                            <UserItem
                                item={item}
                                isSelected={selectedUsers.includes(item.id)}
                                onToggle={toggleUser}
                            />
                        )}
                        contentContainerStyle={tw`pb-24`}
                        ListEmptyComponent={ListEmpty}
                        extraData={selectedUsers}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}
