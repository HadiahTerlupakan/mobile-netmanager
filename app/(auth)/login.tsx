import { FormInput } from '@/components/atoms/FormInput';
import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { useAuth } from '@/context/AuthContext';
import { Events } from '@/constants/Events';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import { biometricService } from '@/services/BiometricService';
import { credentialStorageService } from '@/services/CredentialStorageService';
import api from '@/services/api';
import { presentAppError, presentErrorMessage } from '@/utils/errorPresenter';
import { logger } from '@/utils/logger';
import { LoginSchema } from '@/utils/validation';
import { AxiosError } from 'axios';
import { StatusBar } from 'expo-status-bar';
import { Link, Href } from 'expo-router';
import { Fingerprint, Lock, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Image, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import { z } from 'zod';

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
    const { signIn } = useAuth();

    const {
        control,
        handleValidatedSubmit,
        formState: { errors }
    } = useFormWithValidation({
        schema: LoginSchema,
        defaultValues: {
            email: '',
            password: ''
        }
    });

    useEffect(() => {
        const checkBiometric = async () => {
            const available = await biometricService.isAvailable();
            setBiometricAvailable(available);

            if (available) {
                const enabled = await biometricService.isBiometricEnabled();
                setBiometricEnabled(enabled);
                const types = await biometricService.getSupportedTypes();
                setBiometricTypes(types);
                const hasCreds = await credentialStorageService.hasStoredCredentials();
                setHasStoredCredentials(hasCreds);
            }
        };

        checkBiometric();
    }, []);

    const performLogin = useCallback(async (email: string, password: string, saveCreds = true) => {
        setLoading(true);
        try {
            logger.auth('Attempting login...');
            const res = await api.post('/api/mobile/auth/login', {
                email,
                password,
                versionCode: CURRENT_VERSION_CODE.toString(),
                versionName: CURRENT_VERSION_NAME
            }, {
                skipGlobalAuthHandler: true
            });

            if (res.data.success) {
                logger.auth('[LoginScreen] Login success, calling signIn...');

                if (saveCreds) {
                    await credentialStorageService.saveCredentials(email, password);
                }

                await signIn(
                    res.data.token,
                    res.data.user,
                    res.data.refreshToken
                );

                logger.auth('[LoginScreen] signIn completed, waiting for redirect...');
            } else {
                logger.warn('[LoginScreen] Login failed logic:', res.data);
                presentErrorMessage(res.data.error || 'Terjadi kesalahan', 'Login Gagal');
            }
        } catch (error) {
            const isAxiosErr = error instanceof AxiosError;
            const status = isAxiosErr ? error.response?.status : undefined;
            logger.error('[LoginScreen] Login error:', status, isAxiosErr ? error.response?.data : error);

            if (status === 401) {
                // Selalu clear stored credentials saat 401 — termasuk path
                // biometric (saveCreds=false). Tanpa ini, user terjebak loop:
                // biometric → 401 (password backend berubah) → modal error
                // → biometric → 401, tanpa cara membersihkan brankas.
                await credentialStorageService.clearCredentials();
                setHasStoredCredentials(false);
                presentErrorMessage(
                    saveCreds
                        ? 'Email atau password salah.'
                        : 'Kredensial tersimpan sudah tidak valid. Silakan login manual.',
                    'Login Gagal',
                );
            } else if (status === 426) {
                DeviceEventEmitter.emit(Events.APP_VERSION_UNSUPPORTED, isAxiosErr ? error.response?.data : undefined);
            } else {
                presentAppError(error, {
                    screen: 'LoginScreen',
                    route: '/(auth)/login',
                });
            }
        } finally {
            setLoading(false);
        }
    }, [signIn]);

    const handleLogin = handleValidatedSubmit(async (data: LoginFormData) => {
        await performLogin(data.email, data.password);
    });

    const handleBiometricLogin = useCallback(async () => {
        const credentials = await credentialStorageService.getCredentials();
        if (!credentials) {
            presentErrorMessage(
                'Belum ada kredensial tersimpan. Silakan login manual terlebih dahulu.',
                'Biometrik Belum Siap'
            );
            return;
        }

        const result = await biometricService.authenticate('Login dengan biometrik');
        if (result.success) {
            await performLogin(credentials.email, credentials.password, false);
        } else if (result.error) {
            presentErrorMessage(result.error, 'Autentikasi Gagal');
        }
    }, [performLogin]);

    const showBiometricButton = biometricAvailable && biometricEnabled && hasStoredCredentials;

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-6`}>
            <StatusBar style="dark" />

            <View style={tw`mb-8 items-center`}>
                <Image
                    source={require('@assets/images/icon.png')}
                    style={tw`h-24 w-24 rounded-2xl mb-4`}
                    resizeMode="contain"
                />
                <Text style={tw`text-2xl font-bold text-gray-900`}>RADPRO</Text>
                <Text style={tw`text-gray-500 mt-1`}>
                    Client & Staff Portal
                </Text>
            </View>

            <View style={tw`w-full max-w-sm`}>
                <FormInput
                    name="email"
                    control={control}
                    label="Email / Username / ID Pelanggan"
                    placeholder="Contoh: budi123 atau nama@email.com"
                    keyboardType="default"
                    autoCapitalize="none"
                    leftIcon={<User color="#9ca3af" size={20} />}
                    error={errors.email?.message}
                    testID="email-input"
                    accessibilityLabel="Input email atau username"
                />

                <View style={tw`mt-4`}>
                    <FormInput
                        name="password"
                        control={control}
                        label="Password"
                        placeholder="••••••••"
                        secureTextEntry
                        leftIcon={<Lock color="#9ca3af" size={20} />}
                        error={errors.password?.message}
                        testID="password-input"
                        accessibilityLabel="Input password"
                    />
                </View>

                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    accessibilityLabel="Tombol masuk"
                    accessibilityRole="button"
                    style={tw`bg-blue-600 h-14 rounded-xl items-center justify-center shadow-md mt-8 ${loading ? 'opacity-70' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={tw`text-white font-bold text-lg`}>Sign In</Text>
                    )}
                </TouchableOpacity>

                {showBiometricButton && (
                    <TouchableOpacity
                        onPress={handleBiometricLogin}
                        disabled={loading}
                        accessibilityLabel={`Login dengan ${biometricTypes[0] || 'biometrik'}`}
                        accessibilityRole="button"
                        style={tw`mt-4 h-14 rounded-xl items-center justify-center border border-blue-600 flex-row`}
                    >
                        <Fingerprint color="#2563eb" size={24} />
                        <Text style={tw`text-blue-600 font-bold text-base ml-2`}>
                            Login dengan {biometricTypes[0] || 'Biometrik'}
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={tw`mt-8 items-center gap-1`}>
                    <Text style={tw`text-gray-500 text-sm text-center`}>
                        Dengan masuk, Anda menyetujui
                    </Text>
                    <Link href={'/kebijakan-privasi' as Href} asChild>
                        <TouchableOpacity accessibilityRole="link">
                            <Text style={tw`text-blue-600 font-semibold text-sm text-center`}>
                                Kebijakan Privasi kami
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <Text style={tw`text-gray-400 text-xs text-center mt-6`}>
                    v{CURRENT_VERSION_NAME} (Build {CURRENT_VERSION_CODE})
                </Text>
            </View>
        </View>
    );
}
