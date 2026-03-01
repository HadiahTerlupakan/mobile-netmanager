import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import NotificationBell from '@/components/molecules/NotificationBell';
import { TenantService } from '@/services/TenantService';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

interface DashboardHeaderProps {
    userName: string;
    userImage?: string | null;
    notificationCount?: number;
    onNotificationPress?: () => void;
    onProfilePress?: () => void;
}

export const DashboardHeader = memo(({ userName, userImage, onProfilePress }: DashboardHeaderProps) => {
    const initial = userName ? userName.charAt(0).toUpperCase() : 'K';

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = TenantService.getTenantUrl().replace(/\/$/, '');
        const imagePath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${imagePath}`;
    };

    const finalImage = getImageUrl(userImage);

    return (
        <View style={tw`flex-row items-center justify-between p-4 bg-gray-50 border-b border-gray-200`}>
            {/* Avatar - Now clickable */}
            <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7}>
                {finalImage ? (
                    <ImageWithCache
                        source={finalImage}
                        style={tw`h-10 w-10 rounded-full`}
                        contentFit="cover"
                        transition={1000}
                    />
                ) : (
                    <View style={tw`h-10 w-10 bg-blue-600 rounded-full items-center justify-center`}>
                        <Text style={tw`text-white font-bold text-lg`}>{initial}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Title */}
            <Text style={tw`text-lg font-bold text-gray-900`}>Dashboard</Text>

            {/* Notification Bell */}
            <NotificationBell color="#374151" />
        </View>
    );
});
DashboardHeader.displayName = 'DashboardHeader';
