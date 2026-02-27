import { AppFeature } from '@/constants/features';
import { useAuth } from '@/context/AuthContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ClipboardList, DollarSign, Home, User, Wallet } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

// Maps route names to static icons to ensure consistency for Mitra
const getIcon = (routeName: string, color: string, isFocused: boolean, iconSizeMultiplier: number = 1) => {
    const baseSize = isFocused ? 26 : 24;
    const size = baseSize * iconSizeMultiplier;
    switch (routeName) {
        case 'dashboard':
            return <Home size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
        case 'work-order':
            return <ClipboardList size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
        case 'marketing/canvasing/index':
            return <DollarSign size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
        case 'mitra-wallet':
            return <Wallet size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
        case 'profile':
            return <User size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
        default:
            return <Home size={size} color={color} />;
    }
};

export function MitraTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const hasFeature = (feature: string) => {
        if (!user) return false;
        if (user.role === "SUPER_ADMIN") return true;
        return user.features?.includes(feature) ?? false;
    };

    // Get visible routes first so we know which one is in the middle
    const visibleRoutes = state.routes.filter(route => {
        const ALLOWED_MITRA_ROUTES = ['dashboard', 'work-order', 'marketing/canvasing/index', 'mitra-wallet', 'profile'];
        if (!ALLOWED_MITRA_ROUTES.includes(route.name)) return false;
        if (route.name === 'work-order' && !hasFeature(AppFeature.WORK_ORDER)) return false;
        if (route.name === 'marketing/canvasing/index' && !(hasFeature(AppFeature.CANVASING) && user?.isSales)) return false;

        const { options } = descriptors[route.key];
        if ((options as any).href === null) return false;

        return true;
    });

    return (
        <View style={[tw`absolute bottom-0 w-full px-6 pb-6 pt-2 bg-transparent`, { paddingBottom: insets.bottom > 10 ? insets.bottom : 24 }]}>
            <View style={[
                tw`flex-row justify-around items-center bg-[#252528] rounded-[32px] px-2 py-3 border border-white/5`,
                styles.referenceFloatingBar
            ]}>
                {visibleRoutes.map((route, visibleIndex) => {
                    // Find actual index in state
                    const index = state.routes.findIndex(r => r.key === route.key);
                    const { options } = descriptors[route.key];

                    const isFocused = state.index === index;

                    // Center item calculation (protruding green button logic)
                    const isCenterItem = visibleIndex === Math.floor(visibleRoutes.length / 2);

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    // Default colors for normal items
                    let color = isFocused ? '#ffffff' : '#737373';
                    let iconSizeMultiplier = 1;

                    // Override styles if it's the center protruding item
                    if (isCenterItem) {
                        color = '#000000'; // Black icon on green background
                        iconSizeMultiplier = 1.2;
                    }

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={(options as any).tabBarTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={tw`flex-1 items-center justify-center`}
                            activeOpacity={0.8}
                        >
                            {isCenterItem ? (
                                // Center Protruding Button Style
                                <View style={tw`items-center justify-center`}>
                                    <View style={[
                                        tw`w-[54px] h-[54px] bg-[#4ade80] rounded-full items-center justify-center absolute -top-10`,
                                        {
                                            // Optional: if you want a dark border around the protruding button
                                            borderWidth: 4,
                                            borderColor: '#18181b', // matches a dark app background context
                                        }
                                    ]}>
                                        {getIcon(route.name, color, isFocused, iconSizeMultiplier)}
                                    </View>
                                </View>
                            ) : (
                                // Normal Button Style
                                <View style={tw`items-center justify-center p-2`}>
                                    {getIcon(route.name, color, isFocused, iconSizeMultiplier)}
                                    {isFocused && (
                                        <View style={[
                                            tw`w-1 h-1 bg-white rounded-full mt-1.5 absolute -bottom-1`,
                                            styles.glowDot
                                        ]} />
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    referenceFloatingBar: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    glowDot: {
        shadowColor: "#fff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    }
});
