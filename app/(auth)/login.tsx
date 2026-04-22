import { FormInput } from '@/components/atoms/FormInput';
import { CURRENT_VERSION_CODE, CURRENT_VERSION_NAME } from '@/constants/appVersion';
import { useAuth } from '@/context/AuthContext';
import { Events } from '@/constants/Events';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import { biometricService } from '@/services/BiometricService';
import api from '@/services/api';
import { presentAppError, presentErrorMessage, presentInfoMessage } from '@/utils/errorPresenter';
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

    // Check biometric availability on mount
    useEffect(() => {
        const checkBiometric = async () => {
            const available = await biometricService.isAvailable();
            setBiometricAvailable(available);

            if (available) {
                const enabled = await biometricService.isBiometricEnabled();
                setBiometricEnabled(enabled);
                const types = await biometricService.getSupportedTypes();
                setBiometricTypes(types);
            }
        };

        checkBiometric();
    }, []);

    const performLogin = useCallback(async (email: string, password: string) => {
        setLoading(true);
        try {
            logger.auth('Attempting login...');
            const res = await api.post('/api/mobile/auth/login', {
                email,
                password,
                versionCode: CURRENT_VERSION_CODE.toString(),
                versionName: CURRENT_VERSION_NAME
            }, {
                // IMPORTANT: Prevent global 401 interceptor from hanging the request
                // We want to handle 401 manually (Invalid Password) in this component
                skipGlobalAuthHandler: true
            });

            if (res.data.success) {
                logger.auth('[LoginScreen] Login success, calling signIn...');

                // Add robust token saving and state update
                await signIn(
                    res.data.token,
                    res.data.user,
                    res.data.refreshToken
                );

                // Note: AuthContext handles navigation via Effect based on user state
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
                presentErrorMessage('Email atau password salah.', 'Login Gagal');
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
        const result = await biometricService.authenticate('Login dengan biometrik');

        if (result.success) {
            presentInfoMessage(
                'Autentikasi berhasil. Silakan masukkan kredensial Anda untuk melanjutkan.',
                'Biometrik Berhasil'
            );
        } else if (result.error) {
            presentErrorMessage(result.error, 'Autentikasi Gagal');
        }
    }, []);

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-6`}>
            <StatusBar style="dark" />

            {/* Logo */}
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
                {/* Email/Username Input with React Hook Form */}
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
                />

                {/* Password Input with React Hook Form */}
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
                    />
                </View>

                {/* Login Button */}
                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    style={tw`bg-blue-600 h-14 rounded-xl items-center justify-center shadow-md mt-8 ${loading ? 'opacity-70' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={tw`text-white font-bold text-lg`}>Sign In</Text>
                    )}
                </TouchableOpacity>

                {/* Biometric Login Button */}
                {biometricAvailable && biometricEnabled && (
                    <TouchableOpacity
                        onPress={handleBiometricLogin}
                        disabled={loading}
                        style={tw`mt-4 h-14 rounded-xl items-center justify-center border border-blue-600 flex-row`}
                    >
                        <Fingerprint color="#2563eb" size={24} />
                        <Text style={tw`text-blue-600 font-bold text-base ml-2`}>
                            Login dengan {biometricTypes[0] || 'Biometrik'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Privacy Policy Link */}
                <View style={tw`mt-8 items-center gap-1`}>
                    <Text style={tw`text-gray-500 text-sm text-center`}>
                        Dengan masuk, Anda menyetujui
                    </Text>
                    <Link href={'/kebijakan-privasi' as Href} asChild>
                        <TouchableOpacity>
                            <Text style={tw`text-blue-600 font-semibold text-sm text-center`}>
                                Kebijakan Privasi kami
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </View>
    );
}
