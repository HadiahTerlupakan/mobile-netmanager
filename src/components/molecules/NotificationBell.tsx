import { useApiQuery } from '@/hooks/queries';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface NotificationBellProps {
    color?: string;
}

interface NotificationBellResponse {
    success: boolean;
    data: {
        unreadCount: number;
    };
}

function NotificationBellComponent({ color = '#ffffff' }: NotificationBellProps) {
    const router = useRouter();

    // Use React Query with caching to prevent excessive API calls
    const { data } = useApiQuery<NotificationBellResponse>({
        queryKey: ['notifications', 'unread'],
        endpoint: '/api/mobile/notifications',
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 1000 * 60 * 15, // Refetch every 15 minutes as a slow fallback (relies on Push Notifications primarily)
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch on every mount
    });

    const unreadCount = data?.data.unreadCount ?? 0;

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
