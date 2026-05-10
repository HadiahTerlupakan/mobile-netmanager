import { Events } from '@/constants/Events';
import { fcmService } from '@/services/FirebaseMessagingService';
import { DatabaseService } from '@/services/DatabaseService';
import { RefreshTokenService } from '@/services/RefreshTokenService';
import { TokenService } from '@/services/TokenService';
import { errorReportingService } from '@/services/ErrorReportingService';
import api from '@/services/api';
import { logger } from '@/utils/logger';
import { SecureStorage, Storage } from '@/utils/storage';
import { queryClient } from '@/lib/queryClient';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';

export type User = {
    id: string;
    tenantId: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const tokenRefreshCleanupRef = useRef<(() => void) | null>(null);

    const stopFcmTokenRefreshListener = useCallback(() => {
        tokenRefreshCleanupRef.current?.();
        tokenRefreshCleanupRef.current = null;
    }, []);

    const startFcmTokenRefreshListener = useCallback(() => {
        stopFcmTokenRefreshListener();
        tokenRefreshCleanupRef.current = fcmService.onTokenRefresh();
    }, [stopFcmTokenRefreshListener]);

    const syncFcmToken = useCallback((action: 'add' | 'remove') => {
        const logLabel = action === 'remove' ? 'FCM remove' : 'FCM add';
        fcmService.syncFCMTokenToBackend(action).catch((fcmError: unknown) => {
            logger.warn(`[AuthContext] ${logLabel} failed`, fcmError);
        });
    }, []);

    const clearLocalSession = useCallback(async () => {
        stopFcmTokenRefreshListener();
        TokenService.setToken(null);
        setToken(null);
        setUser(null);
        logger.setTenantId(null);
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
    }, [stopFcmTokenRefreshListener]);

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
            logger.setTenantId(userData.tenantId);

            logger.auth('Syncing FCM token (background)...');
            // FCM sync is non-critical - don't block login if it fails
            try {
                syncFcmToken('add');
                startFcmTokenRefreshListener();
            } catch (fcmError) {
                logger.warn('[AuthContext] FCM sync failed, continuing with login', fcmError);
                // Don't throw - FCM is optional feature
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
    }, [clearLocalSession, startFcmTokenRefreshListener, syncFcmToken]);

    const signOut = useCallback(async (options?: { skipApi?: boolean }) => {
        try {
            if (token && !options?.skipApi) {
                stopFcmTokenRefreshListener();
                syncFcmToken('remove');
            }
        } catch (error) {
            logger.error('Sign out error', error);
            errorReportingService.captureException(error instanceof Error ? error : new Error('Sign out failed'), {
                source: 'auth.signOut',
            });
        } finally {
            await clearLocalSession();
        }
    }, [clearLocalSession, stopFcmTokenRefreshListener, syncFcmToken, token]);

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
                        logger.setTenantId(parsedUser.tenantId);

                        syncFcmToken('add');
                        startFcmTokenRefreshListener();
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
            stopFcmTokenRefreshListener();
        };
    }, [clearLocalSession, startFcmTokenRefreshListener, stopFcmTokenRefreshListener, syncFcmToken]);

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
