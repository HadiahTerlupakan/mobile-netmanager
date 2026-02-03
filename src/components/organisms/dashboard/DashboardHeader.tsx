import NotificationBell from '@/components/molecules/NotificationBell';
import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';
import tw from 'twrnc';

interface DashboardHeaderProps {
    userName: string;
    userImage?: string | null;
}

export const DashboardHeader = ({ userName, userImage }: DashboardHeaderProps) => {
    const initial = userName ? userName.charAt(0).toUpperCase() : 'K';

    return (
        <View style={tw`flex-row items-center justify-between p-4 bg-gray-50 border-b border-gray-200`}>
            {/* Avatar */}
            {userImage ? (
                <Image
                    source={{ uri: userImage }}
                    style={tw`h-10 w-10 rounded-full`}
                    contentFit="cover"
                    transition={1000}
                      />
            ) : (
                <View style={tw`h-10 w-10 bg-blue-600 rounded-full items-center justify-center`}>
                    <Text style={tw`text-white font-bold text-lg`}>{initial}</Text>
                </View>
            )}

            {/* Title */}
            <Text style={tw`text-lg font-bold text-gray-900`}>Dashboard</Text>

            {/* Notification Bell */}
            <NotificationBell color="#374151" />
        </View>
    );
};
