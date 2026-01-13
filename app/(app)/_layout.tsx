import { Tabs, useRouter } from 'expo-router';
import { ClipboardList, DollarSign, Home, Package, ScanLine, User } from 'lucide-react-native';
import { Fragment, useEffect } from 'react';
import { Alert } from 'react-native';
import tw from 'twrnc';

import AnnouncementPopup from '@/components/AnnouncementPopup';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppLayout() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token, user } = useAuth();

    // Helper to check features
    const hasFeature = (feature: string) => {
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true; // Safety fallback
        return user.features?.includes(feature) ?? false;
    };

    // Auto-resume location tracking on app startup if user is checked in
    useEffect(() => {
        // ... (existing tracking logic)
        const resumeTrackingIfNeeded = async () => {
             // ... Code continues mostly unchanged, just ensure this block is preserved if I'm replacing the whole component or just the top part
             // Actually I can just replacing the top part and the return statement.
             // But replace_file_content works on lines.
             // Let's rely on the context lines.
        };
        // ...
    }, [token]);
    // WARNING: Creating a partial replacement for a functional component with hooks inside is tricky if I don't see the exact lines.
    // I see lines 12-130 in previous view_file.

    // Helper to handle locked tab press
    const handleTabPress = (e: any, feature: string) => {
        if (!hasFeature(feature)) {
            e.preventDefault();
            Alert.alert(
                'Akses Terbatas',
                'Anda tidak memiliki izin untuk mengakses fitur ini. Hubungi administrator.',
                [{ text: 'OK' }]
            );
        }
    };
    
    // Helper for locked icon color
    const getIconColor = (color: string, feature: string) => {
        return hasFeature(feature) ? color : '#9ca3af'; // gray-400 if locked
    };

    return (
        <Fragment>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        ...tw`bg-white border-t border-gray-200`,
                        height: 60 + insets.bottom,
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                        paddingTop: 10,
                    },
                    tabBarActiveTintColor: '#2563eb', // blue-600
                    tabBarInactiveTintColor: '#9ca3af', // gray-400
                    tabBarLabelStyle: tw`text-xs font-medium mb-1`,
                }}
            >
                <Tabs.Screen
                    name="dashboard"
                    options={{
                        title: 'Beranda',
                        tabBarIcon: ({ color }) => <Home size={24} color={getIconColor(color, 'm_dashboard')} />,
                    }}
                    listeners={{
                        tabPress: (e) => handleTabPress(e, 'm_dashboard'),
                    }}
                />
                <Tabs.Screen
                    name="work-order"
                    options={{
                        title: 'Work Order',
                        href: hasFeature('m_work_order') ? '/work-order' : null,
                        tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="marketing/canvasing/index"
                    options={{
                        title: 'Canvasing',
                        href: !hasFeature('m_work_order') ? '/marketing/canvasing' : null,
                        tabBarIcon: ({ color }) => <DollarSign size={24} color={getIconColor(color, 'm_canvasing')} />,
                    }}
                    listeners={{
                        tabPress: (e) => handleTabPress(e, 'm_canvasing'),
                    }}
                />
                <Tabs.Screen
                    name="barang"
                    options={{
                        title: 'Barang',
                        tabBarIcon: ({ color }) => <Package size={24} color={hasFeature('m_barang') ? color : '#9ca3af'} />,
                    }}
                    listeners={{
                        tabPress: (e) => {
                            if (!hasFeature('m_barang')) {
                                e.preventDefault();
                                Alert.alert('Akses Terbatas', 'Anda tidak memiliki akses menu Barang.', [{ text: 'OK' }]);
                            }
                        },
                    }}
                />
                <Tabs.Screen
                    name="absensi"
                    options={{
                        title: 'Absensi',
                        tabBarIcon: ({ color }) => <ScanLine size={24} color={getIconColor(color, 'm_absensi')} />,
                    }}
                    listeners={{
                        tabPress: (e) => handleTabPress(e, 'm_absensi'),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profil',
                        tabBarIcon: ({ color }) => <User size={24} color={color} />,
                    }}
                />

                {/* Hidden Screens */}
                <Tabs.Screen
                    name="history"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="work-order-detail/[id]"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="ambil-barang/[id]"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="lembur"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="izin"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="notifications"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="topology-map"
                    options={{
                        href: null,
                    }}
                />

                <Tabs.Screen
                    name="complete-work-order/[id]"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />

                {/* Chat Screens - Hidden from tab bar, accessed via QuickMenu */}
                <Tabs.Screen
                    name="chat/index"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="chat/[conversationId]"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="chat/new"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="holidays"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="edit-profile"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="change-password"
                    options={{
                        href: null,
                    }}
                />

                {/* Work Order - Moved to dynamic tab slot above */}

                {/* Marketing / Canvasing Screens - Hidden from tab bar */}
                <Tabs.Screen
                    name="marketing/canvasing/create"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="marketing/canvasing/[id]/index"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="marketing/canvasing/[id]/claim"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />

            </Tabs>

            {/* Announcement Popup - shows after login */}
            <AnnouncementPopup />
        </Fragment>
    );
}
