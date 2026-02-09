import { useAuth } from '@/context/AuthContext';
import api from '@/services/api'; // Import centralized API
import { Storage } from '@/utils/storage';
// Removed AsyncStorage import
import { formatTimeAgo } from '@/utils/date';
import { logger } from '@/utils/logger';
import { ChevronLeft, ChevronRight, Megaphone, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import tw from 'twrnc';

interface Announcement {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
}

const DISMISSED_STORAGE_KEY = '@dismissed_announcements_mobile';

export default function AnnouncementPopup() {
    const { token } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Add delay to prevent race conditions during app startup
            const timer = setTimeout(() => {
                fetchAnnouncements();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [token]);

    const fetchAnnouncements = async () => {
        try {
            logger.info('[Announcement] Fetching announcements...');
            // Try mobile-specific endpoint first
            // Use 'api' instead of 'axios' - token is handled automatically by interceptors
            const res = await api.get<Announcement[]>('/api/mobile/announcements', {
                params: {
                    active: true
                },
                skipGlobalAuthHandler: true
            });

            if (res.data && Array.isArray(res.data)) {
                // Filter out dismissed announcements
                const dismissedIds = await Storage.getItemJson<string[]>(DISMISSED_STORAGE_KEY) || [];

                // Clean up dismissed IDs - only keep those that are still active
                const activeIds = res.data.map((a: Announcement) => a.id);
                const validDismissedIds = dismissedIds.filter(id => activeIds.includes(id));

                if (validDismissedIds.length !== dismissedIds.length) {
                    await Storage.setItemJson(DISMISSED_STORAGE_KEY, validDismissedIds);
                }

                const newAnnouncements = res.data.filter(
                    (a: Announcement) => !validDismissedIds.includes(a.id)
                );

                if (newAnnouncements.length > 0) {
                    setAnnouncements(newAnnouncements);
                    setIsVisible(true);
                }
            }
        } catch (error) {
            // Log error but don't crash app
            // 401s are now handled globally by api.ts interceptor
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            logger.info('[Announcement] Failed to fetch (silently ignored):', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (announcementId: string) => {
        try {
            // Use 'api' instead of 'axios'
            await api.post(`/api/mobile/announcements/${announcementId}/read`, {
                portal: 'employee'
            });
            logger.info('[AnnouncementPopup] Marked as read:', announcementId);
        } catch (error) {
            logger.error('[AnnouncementPopup] Failed to mark as read:', error);
            // Ignore errors silently
        }
    };

    const handleDismiss = async () => {
        const currentAnn = announcements[currentIndex];

        // Save to dismissed list
        const dismissedIds = await Storage.getItemJson<string[]>(DISMISSED_STORAGE_KEY) || [];
        if (!dismissedIds.includes(currentAnn.id)) {
            dismissedIds.push(currentAnn.id);
            await Storage.setItemJson(DISMISSED_STORAGE_KEY, dismissedIds);
        }

        // Mark as read in backend
        markAsRead(currentAnn.id);

        if (currentIndex < announcements.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsVisible(false);
        }
    };

    const handleDismissAll = async () => {
        // Save all to dismissed list
        const dismissedIds = announcements.map(a => a.id);
        await Storage.setItemJson(DISMISSED_STORAGE_KEY, dismissedIds);

        // Mark all as read
        announcements.forEach(a => markAsRead(a.id));

        setIsVisible(false);
    };

    const formatTime = (dateString: string) => {
        return formatTimeAgo(dateString);
    };

    if (loading || !isVisible || announcements.length === 0) {
        return null;
    }

    const current = announcements[currentIndex];
    const { width } = Dimensions.get('window');

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={tw`flex-1 bg-black/50 justify-center items-center px-4`}>
                <View style={[tw`bg-white rounded-2xl overflow-hidden shadow-2xl`, { width: width - 32, maxHeight: '80%' }]}>
                    {/* Header */}
                    <View style={tw`bg-indigo-600 px-4 py-4`}>
                        <View style={tw`flex-row items-center justify-between`}>
                            <View style={tw`flex-row items-center`}>
                                <View style={tw`bg-white/20 p-2 rounded-lg mr-3`}>
                                    <Megaphone size={20} color="white" />
                                </View>
                                <View>
                                    <Text style={tw`text-white font-bold text-lg`}>Pengumuman</Text>
                                    {announcements.length > 1 && (
                                        <Text style={tw`text-white/80 text-xs`}>
                                            {currentIndex + 1} dari {announcements.length}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={handleDismiss}
                                style={tw`p-2 bg-white/20 rounded-lg`}
                            >
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Content */}
                    <ScrollView style={tw`px-4 py-4`} showsVerticalScrollIndicator={false}>
                        <Text style={tw`text-gray-900 font-bold text-xl mb-2`}>
                            {current.title}
                        </Text>
                        <Text style={tw`text-gray-600 text-base leading-6 mb-3`}>
                            {current.content}
                        </Text>
                        <Text style={tw`text-gray-400 text-xs`}>
                            {formatTime(current.createdAt)}
                        </Text>
                    </ScrollView>

                    {/* Navigation (if multiple) */}
                    {announcements.length > 1 && (
                        <View style={tw`flex-row justify-center py-2 border-t border-gray-100`}>
                            <TouchableOpacity
                                onPress={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                style={tw`p-2 ${currentIndex === 0 ? 'opacity-30' : ''}`}
                            >
                                <ChevronLeft size={24} color="#6b7280" />
                            </TouchableOpacity>
                            <View style={tw`flex-row items-center mx-4`}>
                                {announcements.map((_, idx) => (
                                    <View
                                        key={idx}
                                        style={tw`w-2 h-2 rounded-full mx-1 ${idx === currentIndex ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                    />
                                ))}
                            </View>
                            <TouchableOpacity
                                onPress={() => setCurrentIndex(prev => Math.min(announcements.length - 1, prev + 1))}
                                disabled={currentIndex === announcements.length - 1}
                                style={tw`p-2 ${currentIndex === announcements.length - 1 ? 'opacity-30' : ''}`}
                            >
                                <ChevronRight size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={tw`px-4 py-4 bg-gray-50 border-t border-gray-100 flex-row justify-between items-center`}>
                        <TouchableOpacity onPress={handleDismissAll}>
                            <Text style={tw`text-gray-500 text-sm`}>Tutup Semua</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={tw`bg-indigo-600 px-5 py-2.5 rounded-lg`}
                        >
                            <Text style={tw`text-white font-semibold`}>
                                {currentIndex < announcements.length - 1 ? 'Berikutnya' : 'Mengerti'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
