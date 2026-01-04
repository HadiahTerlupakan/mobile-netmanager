import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Bell, Briefcase, Calendar, Clock, Megaphone, Package } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    sourceType?: string;
    sourceId?: string;
    createdAt: string;
}

export default function NotificationsScreen() {
    const { token } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Offline Query for Notifications
    const { data: notifData, refetch } = useOfflineQuery<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }>({
        key: 'notifications_list',
        fetcher: async () => {
            const res = await axios.get(`${Config.API_URL}/api/mobile/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        enabled: !!token
    });

    // Offline Mutation for Actions
    const { mutate } = useOfflineMutation();

    const notifications = notifData?.data?.notifications || [];
    const unreadCount = notifData?.data?.unreadCount || 0;

    useEffect(() => {
        if (notifData) {
            setLoading(false);
        }
    }, [notifData]);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const markAsRead = async (notificationId: string) => {
        await mutate({ action: 'markRead', notificationId }, {
            url: `/api/mobile/notifications`,
            method: 'POST',
            onSuccess: () => {
                // Optimistically handled by refetch or could update cache manually
                // For simplicity, we just refetch
                refetch();
            }
        });
    };

    const markAllAsRead = async () => {
        await mutate({ action: 'markAllRead' }, {
             url: `/api/mobile/notifications`,
             method: 'POST',
             onSuccess: () => refetch()
        });
    };

    const markAnnouncementAsRead = async (sourceId: string) => {
        // Track announcement read to AnnouncementRead table (use mobile endpoint)
        await mutate({ portal: 'employee' }, {
            url: `/api/mobile/announcements/${sourceId}/read`,
            method: 'POST',
        });
        console.log('[Notifications] Marked announcement as read (queued if offline):', sourceId);
    };

    const handleNotificationPress = (notification: Notification) => {
        const proceed = () => {
            if (!notification.isRead) {
                markAsRead(notification.id);
            }
            // If it's an announcement, also track to AnnouncementRead
            if (notification.sourceType === 'ANNOUNCEMENT' && notification.sourceId) {
                markAnnouncementAsRead(notification.sourceId);
            }
            if (notification.link) {
                router.push(notification.link as any);
            }
        };

        if (notification.sourceType === 'ANNOUNCEMENT' && !notification.isRead) {
            // Confirm read for analytics
            const { Alert } = require('react-native');
            Alert.alert(
                'Konfirmasi',
                'Apakah Anda sudah membaca pengumuman ini?',
                [
                    {
                        text: 'Belum',
                        style: 'cancel',
                        onPress: () => {
                            // Just navigate without marking as read
                            if (notification.link) router.push(notification.link as any);
                        }
                    },
                    {
                        text: 'Sudah',
                        onPress: () => {
                            proceed();
                        }
                    }
                ]
            );
        } else {
            proceed();
        }
    };

    const getIcon = (sourceType?: string) => {
        switch (sourceType) {
            case 'WORK_ORDER':
                return <Briefcase size={20} color="#3b82f6" />;
            case 'LEAVE':
                return <Calendar size={20} color="#10b981" />;
            case 'OVERTIME':
                return <Clock size={20} color="#f59e0b" />;
            case 'INVENTORY':
                return <Package size={20} color="#8b5cf6" />;
            case 'ANNOUNCEMENT':
                return <Megaphone size={20} color="#ec4899" />;
            default:
                return <Bell size={20} color="#6b7280" />;
        }
    };

    const formatTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-blue-600 px-4 py-4 flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => router.back()} style={tw`p-2 -ml-2`}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={tw`text-white font-bold text-lg ml-2`}>Notifikasi</Text>
                    {unreadCount > 0 && (
                        <View style={tw`bg-red-500 rounded-full px-2 py-0.5 ml-2`}>
                            <Text style={tw`text-white text-xs font-bold`}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={tw`text-blue-100 text-sm font-medium`}>Tandai Dibaca</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={tw`pb-6`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {notifications.length === 0 ? (
                    <View style={tw`items-center justify-center py-20`}>
                        <Bell size={48} color="#d1d5db" />
                        <Text style={tw`text-gray-400 text-lg mt-4`}>Belum ada notifikasi</Text>
                    </View>
                ) : (
                    notifications.map((notif) => (
                        <TouchableOpacity
                            key={notif.id}
                            onPress={() => handleNotificationPress(notif)}
                            style={tw`flex-row p-4 border-b border-gray-100 ${!notif.isRead ? 'bg-blue-50' : 'bg-white'}`}
                        >
                            <View style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3`}>
                                {getIcon(notif.sourceType)}
                            </View>
                            <View style={tw`flex-1`}>
                                <View style={tw`flex-row items-center justify-between mb-1`}>
                                    <Text style={tw`font-bold text-gray-800 flex-1`} numberOfLines={1}>
                                        {notif.title}
                                    </Text>
                                    {!notif.isRead && (
                                        <View style={tw`w-2 h-2 rounded-full bg-blue-500 ml-2`} />
                                    )}
                                </View>
                                <Text style={tw`text-gray-600 text-sm mb-1`} numberOfLines={2}>
                                    {notif.message}
                                </Text>
                                <Text style={tw`text-gray-400 text-xs`}>
                                    {formatTime(notif.createdAt)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
