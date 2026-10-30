import { ImageWithCache } from '@/components/atoms/ImageWithCache';
import NotificationBell from '@/components/molecules/NotificationBell';
import { TombolLonceng } from '@/components/molecules/TombolLonceng';
import { urlGambarTenant } from '@/utils/urlGambarTenant';
import React, { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTemaPersona } from '@/theme';

interface DashboardHeaderProps {
    userName: string;
    userImage?: string | null;
    notificationCount?: number;
    onNotificationPress?: () => void;
    onProfilePress?: () => void;
}

/** gray-700 */
const WARNA_LONCENG = '#374151';

export const DashboardHeader = memo(({ userName, userImage, notificationCount = 0, onNotificationPress, onProfilePress }: DashboardHeaderProps) => {
    const { tw } = useTemaPersona();
    const initial = userName ? userName.charAt(0).toUpperCase() : 'K';

    const finalImage = urlGambarTenant(userImage);

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
                    <View style={tw`h-10 w-10 bg-utama-kuat rounded-full items-center justify-center`}>
                        <Text style={tw`text-white font-bold text-lg`}>{initial}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Title */}
            <Text style={tw`text-lg font-bold text-gray-900`}>Dashboard</Text>

            {/* Pemanggil yang punya sumber notifikasi sendiri (pelanggan) memberi
                angka & tujuan; selain itu lonceng karyawan yang mengurus dirinya. */}
            {onNotificationPress ? (
                <TombolLonceng jumlah={notificationCount} onTekan={onNotificationPress} warna={WARNA_LONCENG} />
            ) : (
                <NotificationBell color={WARNA_LONCENG} />
            )}
        </View>
    );
});
DashboardHeader.displayName = 'DashboardHeader';
