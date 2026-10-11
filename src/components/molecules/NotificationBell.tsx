import { useAuth } from '@/context/AuthContext';
import { useApiQuery } from '@/hooks/queries';
import { queryKeys } from '@/lib/queryClient';
import { isAkunInvestor } from '@/utils/investor';
import { isAkunPelanggan } from '@/utils/pelanggan';
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
    const { user } = useAuth();

    // Lonceng ini milik karyawan: endpointnya menolak token pelanggan dengan
    // 401 — dan penangan 401 global menutup sesi, sehingga pelanggan
    // tertendang kembali ke login beberapa detik setelah masuk. Tujuannya pun
    // rute karyawan `(app)/notifications`. Beranda pelanggan ikut memakai
    // `DashboardHeader`, jadi penjagaan ditaruh di sini agar berlaku untuk
    // semua tempat yang memasangnya, sekarang maupun nanti.
    // Investor sama persis: token-nya beraudience sendiri sehingga endpoint
    // notifikasi karyawan menjawab 401. Hari ini belum meledak hanya karena
    // Beranda investor kebetulan tidak memasang lonceng — penjaganya ditaruh
    // di sini supaya menambahkannya nanti tidak menendang investor ke login.
    const isTanpaLonceng = isAkunPelanggan(user) || isAkunInvestor(user);

    // Use React Query with caching to prevent excessive API calls
    const { data } = useApiQuery<NotificationBellResponse>({
        queryKey: queryKeys.notifications.unread(),
        endpoint: '/api/mobile/notifications',
        enabled: !isTanpaLonceng,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 1000 * 60 * 15, // Refetch every 15 minutes as a slow fallback (relies on Push Notifications primarily)
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Don't refetch on every mount
    });

    const unreadCount = data?.data.unreadCount ?? 0;

    if (isTanpaLonceng) return null;

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
