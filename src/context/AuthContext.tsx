import { Events } from '@/constants/Events';
import { addNotificationListeners, registerForPushNotificationsAsync } from '@/services/PushNotificationService';
import { TokenService } from '@/services/TokenService';
import { RefreshTokenService } from '@/services/RefreshTokenService';
import api from '@/services/api';
import { logger } from '@/utils/logger';
import { isAxiosError } from 'axios';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';

export type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    features?: string[];
    isSales?: boolean;
    image?: string | null;
    workDays?: string | null;
    workingHourMode?: string | null;
    isOnLeave?: boolean;
};

export type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    signIn: (token: string, userData: User, refreshToken?: string) => Promise<void>;
    signOut: (options?: { skipApi?: boolean }) => Promise<void>;
    updateUser: (userData: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for push registration to avoid duplication
const registerPush = async (authToken: string) => {
    try {
        await registerForPushNotificationsAsync(authToken);
    } catch (err) {
        // Ignore 401s here as they will trigger the unauthorized listener
        if (!isAxiosError(err) || err.response?.status !== 401) {
            logger.error('Push registration failed:', err);
        }
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const signIn = useCallback(async (newToken: string, userData: User, refreshToken?: string) => {
        setIsLoading(true);
        logger.auth('signIn started for:', userData.email);
        try {
            // Optimization: Update in-memory token first
            TokenService.setToken(newToken);

            logger.auth('Saving token...');
            await SecureStore.setItemAsync('session_token', newToken);

            // Save refresh token if provided
            if (refreshToken) {
                logger.auth('Saving refresh token...');
                await RefreshTokenService.saveRefreshToken(refreshToken);
            }

            logger.auth('Saving user data...');
            await SecureStore.setItemAsync('user_data', JSON.stringify(userData));

            logger.auth('Updating state...');
            setToken(newToken);
            setUser(userData);

            // Register for push notifications
            logger.auth('Registering push notifications...');

            // Critical: Await push registration to ensure backend updates token ownership
            // This prevents "Zombie Token" issues where previous user still owns the token
            await registerPush(newToken);

            logger.auth('signIn complete');
        } catch (error) {
            logger.error('[AuthContext] Sign in error', error);
            Alert.alert('Login Error', 'Gagal menyimpan sesi login');
        } finally {
            setIsLoading(false);
            logger.auth('Loading state set to false');
        }
    }, []);

    const signOut = useCallback(async (options?: { skipApi?: boolean }) => {
        try {
            // Remove push token from backend only if not skipping API (e.g. not a 401 logout)
            // Use current token from state since this function will be recreated on token change
            if (token && !options?.skipApi) {
                try {
                    await api.delete('/api/mobile/push-token');
                } catch (e) {
                    // Ignore errors during signout
                    logger.warn('Failed to remove push token during signout:', e);
                }
            }

            // Optimization: Clear in-memory token
            TokenService.setToken(null);

            // Clear refresh token
            await RefreshTokenService.clearRefreshToken();

            await SecureStore.deleteItemAsync('session_token');
            await SecureStore.deleteItemAsync('user_data');
            setToken(null);
            setUser(null);
        } catch (error) {
            logger.error('Sign out error', error);
        }
    }, [token]);

    const updateUser = useCallback(async (userData: User) => {
        try {
            logger.auth('Updating user data in storage...');
            await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            logger.error('Failed to update user data', error);
        }
    }, []);

    // Unified initialization effect with cleanup
    useEffect(() => {
        let notificationCleanup: (() => void) | undefined;
        let isMounted = true;
        let authSubscription: any;

        const initialize = async () => {
            // Load storage data
            try {
                const storedToken = await SecureStore.getItemAsync('session_token');
                const storedUser = await SecureStore.getItemAsync('user_data');

                if (!isMounted) return;

                if (storedToken && storedUser) {
                    // Optimization: Set token in memory immediately
                    TokenService.setToken(storedToken);
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));

                    // Background registration
                    registerPush(storedToken);

                    // Setup notification listeners (Logging only)
                    // Navigation is handled in RootLayout
                    notificationCleanup = addNotificationListeners(
                        (notification: Notifications.Notification) => {
                            logger.info('[Push][Auth] Received:', notification.request.content.title);
                        },
                        (response: Notifications.NotificationResponse) => {
                            logger.info('[Push][Auth] Tapped:', response.notification.request.content.title);
                        }
                    );
                }
            } catch (e) {
                logger.error('Failed to load auth storage', e);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        initialize();

        // Listen for unauthorized events
        authSubscription = DeviceEventEmitter.addListener(Events.AUTH_UNAUTHORIZED, () => {
            logger.warn('[Auth] Received unauthorized event, logging out...');
            signOut({ skipApi: true });
        });

        return () => {
            isMounted = false;
            if (authSubscription) {
                authSubscription.remove();
            }
            if (notificationCleanup) {
                notificationCleanup();
            }
        };
    }, [signOut]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<AuthContextType>(() => ({
        user,
        token,
        isLoading,
        signIn,
        signOut,
        updateUser
    }), [user, token, isLoading, signIn, signOut, updateUser]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
