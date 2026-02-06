import { Events } from '@/constants/Events';
import { registerForPushNotificationsAsync } from '@/services/PushNotificationService';
import api from '@/services/api';
import { eventManager } from '@/utils/EventManager';
import { logger } from '@/utils/logger';
import { isAxiosError } from 'axios';
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
    signIn: (token: string, userData: User) => Promise<void>;
    signOut: (options?: { skipApi?: boolean }) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (userData: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Refs for stable access to latest state without forcing re-renders of functions
    const tokenRef = React.useRef(token);

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    const loadStorageData = useCallback(async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('session_token');
            const storedUser = await SecureStore.getItemAsync('user_data');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));

                // Re-register push token on app start
                // Pass storedToken explicitly
                registerForPushNotificationsAsync(storedToken).catch(err => {
                    // Ignore 401s here as they will trigger the unauthorized listener
                    if (!isAxiosError(err) || err.response?.status !== 401) {
                        logger.error('Push registration failed:', err);
                    }
                });
            }
        } catch (e) {
            logger.error('Failed to load auth storage', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signIn = useCallback(async (newToken: string, userData: User) => {
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
    }, []);

    // signOut is now stable and doesn't depend on token changes
    const signOut = useCallback(async (options?: { skipApi?: boolean }) => {
        try {
            const currentToken = tokenRef.current;
            // Remove push token from backend only if not skipping API (e.g. not a 401 logout)
            if (currentToken && !options?.skipApi) {
                try {
                    await api.delete('/api/mobile/push-token');
                } catch (e) {
                    // Ignore errors during signout
                    logger.warn('Failed to remove push token during signout:', e);
                }
            }

            await SecureStore.deleteItemAsync('session_token');
            await SecureStore.deleteItemAsync('user_data');
            setToken(null);
            setUser(null);
        } catch (error) {
            logger.error('Sign out error', error);
        }
    }, []);

    const updateUser = useCallback(async (userData: User) => {
        try {
            logger.auth('Updating user data in storage...');
            await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            logger.error('Failed to update user data', error);
        }
    }, []);

    // Alias for signOut - also memoized
    const logout = useCallback(() => signOut(), [signOut]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo<AuthContextType>(() => ({
        user,
        token,
        isLoading,
        signIn,
        signOut,
        logout,
        updateUser
    }), [user, token, isLoading, signIn, signOut, logout, updateUser]);

    // Initial load effect
    useEffect(() => {
        loadStorageData();
    }, [loadStorageData]);

    // Unauthorized event listener effect - depends on stable signOut
    useEffect(() => {
        // Listen for unauthorized events
        const handler = () => {
            logger.warn('[Auth] Received unauthorized event, logging out...');
            // Skip API call since token is invalid
            signOut({ skipApi: true });
        };

        const subscription = DeviceEventEmitter.addListener(Events.AUTH_UNAUTHORIZED, handler);

        // Register with EventManager
        eventManager.addListener('auth', handler, () => subscription.remove());

        return () => {
            eventManager.removeListener('auth', handler);
        };
    }, [signOut]);

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
