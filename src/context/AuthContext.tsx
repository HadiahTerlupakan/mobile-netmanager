import { Events } from '@/constants/Events';
import { registerForPushNotificationsAsync } from '@/services/PushNotificationService';
import { TokenService } from '@/services/TokenService';
import { RefreshTokenService } from '@/services/RefreshTokenService';
import api from '@/services/api';
import { logger } from '@/utils/logger';
import { SecureStorage } from '@/utils/storage';
import { isAxiosError } from 'axios';
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
            await SecureStorage.setItem('session_token', newToken);

            // Save refresh token if provided
            if (refreshToken) {
                logger.auth('Saving refresh token...');
                await RefreshTokenService.saveRefreshToken(refreshToken);
            }

            logger.auth('Saving user data...');
            await SecureStorage.setItem('user_data', JSON.stringify(userData));

            logger.auth('Updating state...');
            setToken(newToken);
            setUser(userData);

            // Register for push notifications (non-blocking)
            // Don't await - login should not be blocked by push registration
            logger.auth('Registering push notifications (background)...');
            registerPush(newToken);

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

            await SecureStorage.removeItem('session_token');
            await SecureStorage.removeItem('user_data');
            setToken(null);
            setUser(null);
        } catch (error) {
            logger.error('Sign out error', error);
        }
    }, [token]);

    const updateUser = useCallback(async (userData: User) => {
        try {
            logger.auth('Updating user data in storage...');
            await SecureStorage.setItem('user_data', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            logger.error('Failed to update user data', error);
        }
    }, []);

    // Unified initialization effect with cleanup
    useEffect(() => {
        let isMounted = true;
        let authSubscription: any;

        const initialize = async () => {
            // Load storage data
            try {
                const storedToken = await SecureStorage.getItem('session_token');
                const storedUser = await SecureStorage.getItem('user_data');

                if (!isMounted) return;

                if (storedToken && storedUser) {
                    // Optimization: Set token in memory immediately
                    TokenService.setToken(storedToken);
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));

                    // Background registration (non-blocking)
                    registerPush(storedToken);
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
