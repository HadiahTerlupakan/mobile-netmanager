import { Events } from '@/constants/Events';
import { addNotificationListeners, registerForPushNotificationsAsync } from '@/services/PushNotificationService';
import api from '@/services/api';
import logger from '@/utils/logger';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    signIn: (token: string, userData: User) => Promise<void>;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStorageData();

        // Listen for unauthorized events
        const subscription = DeviceEventEmitter.addListener(Events.AUTH_UNAUTHORIZED, () => {
            logger.warn('[Auth] Received unauthorized event, logging out...');
            signOut();
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Setup notification listeners when user is logged in
    useEffect(() => {
        if (token) {
            const cleanup = addNotificationListeners(
                (notification) => {
                    logger.info('[Push] Received:', notification.request.content.title);
                },
                (response) => {
                    logger.info('[Push] Tapped:', response.notification.request.content.title);
                    // TODO: Navigate to notification target
                }
            );
            return cleanup;
        }
    }, [token]);

    async function loadStorageData() {
        try {
            const storedToken = await SecureStore.getItemAsync('session_token');
            const storedUser = await SecureStore.getItemAsync('user_data');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));

                // Re-register push token on app start
                registerForPushNotificationsAsync(storedToken).catch(logger.error);
            }
        } catch (e) {
            logger.error('Failed to load auth storage', e);
        } finally {
            setIsLoading(false);
        }
    }

    async function signIn(newToken: string, userData: User) {
        setIsLoading(true);
        logger.auth('signIn started for:', userData.email);
        try {
            logger.auth('Saving token...');
            await SecureStore.setItemAsync('session_token', newToken);
            logger.auth('Saving user data...');
            await SecureStore.setItemAsync('user_data', JSON.stringify(userData));

            logger.auth('Updating state...');
            setToken(newToken);
            setUser(userData);

            // Register for push notifications
            logger.auth('Registering push notifications...');
            registerForPushNotificationsAsync(newToken).catch(logger.error);

            logger.auth('signIn complete');
        } catch (error) {
            logger.error('[AuthContext] Sign in error', error);
            Alert.alert('Login Error', 'Gagal menyimpan sesi login');
        } finally {
            setIsLoading(false);
            logger.auth('Loading state set to false');
        }
    }

    async function signOut() {
        try {
            // Remove push token from backend
            if (token) {
                try {
                    await api.delete('/api/mobile/push-token');
                } catch (e) {
                    logger.error('Failed to remove push token:', e);
                }
            }

            await SecureStore.deleteItemAsync('session_token');
            await SecureStore.deleteItemAsync('user_data');
            setToken(null);
            setUser(null);
        } catch (error) {
            logger.error('Sign out error', error);
        }
    }

    // Alias for signOut
    const logout = signOut;

    return (
        <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut, logout }}>
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
