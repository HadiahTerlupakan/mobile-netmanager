import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import tw from 'twrnc';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '@/services/api'; // Use centralized API
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/utils/logger';

interface NotificationBellProps {
    color?: string;
}

function NotificationBellComponent({ color = '#ffffff' }: NotificationBellProps) {
    const { token } = useAuth();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        if (!token) return;
        try {
            // Use api.get instead of axios.get
            const res = await api.get('/api/mobile/notifications');
            if (res.data.success) {
                setUnreadCount(res.data.data.unreadCount);
            }
        } catch {
            logger.info('Failed to fetch notifications (silently ignored)');
        }
    }, [token]);

    // Fetch on focus
    useFocusEffect(
        useCallback(() => {
            fetchUnreadCount();
        }, [fetchUnreadCount])
    );

    // Poll every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

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
