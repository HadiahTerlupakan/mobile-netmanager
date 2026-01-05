import { Tabs } from 'expo-router';
import { ClipboardList, Home, Package, ScanLine, User } from 'lucide-react-native';
import { Fragment, useEffect } from 'react';
import tw from 'twrnc';

import AnnouncementPopup from '@/components/AnnouncementPopup';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import { LocationTrackingService } from '@/services/LocationTrackingService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppLayout() {
    const insets = useSafeAreaInsets();
    const { token } = useAuth();

    // Auto-resume location tracking on app startup if user is checked in
    useEffect(() => {
        const resumeTrackingIfNeeded = async () => {
            if (!token) {
                console.log('[AppLayout] No token, skipping tracking resume');
                return;
            }
            
            const timestamp = new Date().toISOString();
            console.log(`[AppLayout][${timestamp}] Checking for active check-in...`);
            
            try {
                // Use history endpoint with limit=1 to get latest attendance
                const response = await fetch(`${Config.API_URL}/api/mobile/attendance/history?limit=1`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                console.log(`[AppLayout][${timestamp}] Response status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`[AppLayout][${timestamp}] Response data:`, JSON.stringify(data));
                    
                    // Check if there's an active check-in today
                    if (data.success && data.data && data.data.length > 0) {
                        const lastAttendance = data.data[0];
                        const today = new Date().toDateString();
                        const attendanceDate = new Date(lastAttendance.checkIn).toDateString();
                        
                        console.log(`[AppLayout][${timestamp}] Last attendance date: ${attendanceDate}, Today: ${today}`);
                        console.log(`[AppLayout][${timestamp}] Has checkOut: ${!!lastAttendance.checkOut}`);
                        
                        // If checked in today and not checked out, resume tracking
                        if (today === attendanceDate && !lastAttendance.checkOut) {
                            console.log(`[AppLayout][${timestamp}] ✅ Active check-in found! Resuming location tracking...`);
                            const started = await LocationTrackingService.startTracking();
                            console.log(`[AppLayout][${timestamp}] Tracking started: ${started}`);
                        } else {
                            console.log(`[AppLayout][${timestamp}] No active check-in for today`);
                        }
                    } else {
                        console.log(`[AppLayout][${timestamp}] No attendance history found`);
                    }
                } else {
                    console.warn(`[AppLayout][${timestamp}] Failed to fetch attendance status: ${response.status}`);
                }
            } catch (error) {
                console.warn(`[AppLayout][${timestamp}] Error checking attendance:`, error);
            }
        };
        
        resumeTrackingIfNeeded();
    }, [token]);

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
                        tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="work-order"
                    options={{
                        title: 'Work Order',
                        tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="barang"
                    options={{
                        title: 'Barang',
                        tabBarIcon: ({ color }) => <Package size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="absensi"
                    options={{
                        title: 'Absensi',
                        tabBarIcon: ({ color }) => <ScanLine size={24} color={color} />,
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

            </Tabs>

            {/* Announcement Popup - shows after login */}
            <AnnouncementPopup />
        </Fragment>
    );
}
