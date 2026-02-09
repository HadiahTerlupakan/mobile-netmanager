import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import { useApiQuery } from '@/hooks/queries';

interface NotificationBellProps {
    color?: string;
}

function NotificationBellComponent({ color = '#ffffff' }: NotificationBellProps) {
    const router = useRouter();

    // Use React Query with caching to prevent excessive API calls
    const { data } = useApiQuery<{ unreadCount: number }>({
        queryKey: ['notifications', 'unread'],
        endpoint: '/api/mobile/notifications',
        staleTime: 1000 * 60 * 2, // 2 minutes - consider data fresh
        refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes (reduced from 30s)
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch on every mount
    });

    const unreadCount = data?.unreadCount ?? 0;

    const handlePress = () => {
        router.push('/(app)/notifications');
    };

    return (
        <TouchableOpacity onPress={handlePress} style={tw`relative p-2`}>
            <Bell size={24} color={color} />
            {unreadCount > 0 && (
                <View style={tw`absolute -top-0 -right-0 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center px-1`}>
                    <Text style={tw`text-white text-xs font-bold`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// Wrap with React.memo to prevent unnecessary re-renders
const NotificationBell = React.memo(NotificationBellComponent);
NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;
