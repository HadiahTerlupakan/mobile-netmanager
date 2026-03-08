import { Events } from '@/constants/Events';
import { fcmService } from '@/services/FirebaseMessagingService';
import { registerForPushNotificationsAsync } from '@/services/PushNotificationService';
import { DatabaseService } from '@/services/DatabaseService';
import { RefreshTokenService } from '@/services/RefreshTokenService';
import { TokenService } from '@/services/TokenService';
import { errorReportingService } from '@/services/ErrorReportingService';
import api from '@/services/api';
import { logger } from '@/utils/logger';
import { SecureStorage, Storage } from '@/utils/storage';
import { queryClient } from '@/lib/queryClient';
import { isAxiosError } from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';

export type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    features?: string[];
    employeeType?: 'KARYAWAN' | 'MITRA_TEKNISI' | 'MITRA_SALES';
    isSales?: boolean;
    image?: string | null;
    workDays?: string | null;
    workingHourMode?: string | null;
    isOnLeave?: boolean;
    requiresFaceVerification?: boolean;
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

const isMitraUser = (userData: User | null | undefined): userData is User =>
    userData?.role === 'MITRA' || userData?.employeeType === 'MITRA_TEKNISI' || userData?.employeeType === 'MITRA_SALES';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const clearLocalSession = useCallback(async () => {
        TokenService.setToken(null);
        setToken(null);
        setUser(null);
        queryClient.clear();

        const cleanupResults = await Promise.allSettled([
            DatabaseService.clearSessionData(),
            RefreshTokenService.clearRefreshToken(),
            Storage.removeItemStrict('TANSTACK_QUERY_CACHE'),
            SecureStorage.removeItemStrict('session_token'),
            SecureStorage.removeItemStrict('user_data'),
        ]);

        cleanupResults.forEach((result, index) => {
            if (result.status === 'rejected') {
                logger.warn('[AuthContext] Local cleanup step failed', { index, reason: result.reason });
            }
        });
    }, []);

    const signIn = useCallback(async (newToken: string, userData: User, refreshToken?: string) => {
        setIsLoading(true);
        logger.auth('signIn started for:', userData.email);
        try {
            // Optimization: Update in-memory token first
            TokenService.setToken(newToken);

            logger.auth('Saving token...');
            await SecureStorage.setItemStrict('session_token', newToken);

            // Save refresh token if provided
            if (refreshToken) {
                logger.auth('Saving refresh token...');
                await RefreshTokenService.saveRefreshToken(refreshToken);
            }

            logger.auth('Saving user data...');
            await SecureStorage.setItemStrict('user_data', JSON.stringify(userData));

            logger.auth('Updating state...');
            setToken(newToken);
            setUser(userData);

            // Register for push notifications (non-blocking)
            // Don't await - login should not be blocked by push registration
            logger.auth('Registering push notifications (background)...');
            registerPush(newToken);

            // FCM Target for Mitra
            if (isMitraUser(userData)) {
                fcmService.syncFCMTokenToBackend('add').catch((fcmError: unknown) => logger.error('FCM Add error', fcmError));
                fcmService.onTokenRefresh();
            }

            logger.auth('signIn complete');
        } catch (error) {
            logger.error('[AuthContext] Sign in error', error);
            errorReportingService.captureException(error instanceof Error ? error : new Error('Sign in failed'), {
                source: 'auth.signIn',
                email: userData.email,
            });
            await clearLocalSession();
            Alert.alert('Login Error', 'Gagal menyimpan sesi login');
        } finally {
            setIsLoading(false);
            logger.auth('Loading state set to false');
        }
    }, [clearLocalSession]);

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

                // FCM Target Logout for Mitra (using current user state)
                if (isMitraUser(user)) {
                    fcmService.syncFCMTokenToBackend('remove').catch((fcmError: unknown) => logger.warn('Failed to remove FCM token', fcmError));
                }
            }
        } catch (error) {
            logger.error('Sign out error', error);
            errorReportingService.captureException(error instanceof Error ? error : new Error('Sign out failed'), {
                source: 'auth.signOut',
            });
        } finally {
            await clearLocalSession();
        }
    }, [clearLocalSession, token, user]);

    const fetchProfile = useCallback(async () => {
        try {
            logger.auth('Fetching updated profile...');
            const response = await api.get('/api/mobile/auth/me');
            const userData = response.data.data;

            logger.auth('Updating user data in storage with new profile...');
            await SecureStorage.setItemStrict('user_data', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            logger.error('Failed to fetch updated profile', error);
            errorReportingService.captureException(error instanceof Error ? error : new Error('Fetch profile failed'), {
                source: 'auth.fetchProfile',
            });
        }
    }, []);

    const updateUser = useCallback(async (userData: User) => {
        try {
            logger.auth('Updating user data in storage...');
            await SecureStorage.setItemStrict('user_data', JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            logger.error('Failed to update user data', error);
            errorReportingService.captureException(error instanceof Error ? error : new Error('Update user failed'), {
                source: 'auth.updateUser',
            });
        }
    }, []);

    // Initialization effect (runs only once on mount)
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            // Load storage data
            try {
                const storedToken = await SecureStorage.getItem('session_token');
                const storedUser = await SecureStorage.getItem('user_data');

                if (!isMounted) return;

                if (storedToken && storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser) as User;

                        TokenService.setToken(storedToken);
                        setToken(storedToken);
                        setUser(parsedUser);

                        registerPush(storedToken);
                    } catch (parseError) {
                        logger.error('Failed to parse stored user data', parseError);
                        await clearLocalSession();
                    }
                }
            } catch (e) {
                logger.error('Failed to load auth storage', e);
                errorReportingService.captureException(e instanceof Error ? e : new Error('Auth storage load failed'), {
                    source: 'auth.initialize',
                });
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        initialize();

        return () => {
            isMounted = false;
        };
    }, [clearLocalSession]);

    // Event listeners effect (re-binds when signOut/fetchProfile changes)
    useEffect(() => {
        // Listen for unauthorized events
        const permissionSub = DeviceEventEmitter.addListener(Events.USER_PERMISSIONS_UPDATE, () => {
            logger.auth('[Auth] Received permissions update event, refreshing profile...');
            fetchProfile();
        });

        const authSubscription = DeviceEventEmitter.addListener(Events.AUTH_UNAUTHORIZED, () => {
            logger.warn('[Auth] Received unauthorized event, logging out...');
            signOut({ skipApi: true });
        });

        return () => {
            if (authSubscription) {
                authSubscription.remove();
            }
            if (permissionSub) {
                permissionSub.remove();
            }
        };
    }, [signOut, fetchProfile]);

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
