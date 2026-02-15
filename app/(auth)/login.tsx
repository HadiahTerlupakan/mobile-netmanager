import { FormInput } from '@/components/atoms/FormInput';
import { useAuth } from '@/context/AuthContext';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import { biometricService } from '@/services/BiometricService';
import api from '@/services/api';
import { getUserFriendlyError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { LoginSchema } from '@/utils/validation';
import { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { Fingerprint, Lock, Mail, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import { z } from 'zod';

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginScreen() {
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
    // Login Type State: EMPLOYEE (Karyawan) vs CUSTOMER (Pelanggan)
    const [loginType, setLoginType] = useState<'EMPLOYEE' | 'CUSTOMER'>('EMPLOYEE');
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
            const versionCode = Constants.expoConfig?.extra?.versionCode || 15;
            const versionName = Constants.expoConfig?.version || '1.0.0';

            logger.auth('Attempting login...');
            const res = await api.post('/api/mobile/auth/login', {
                email,
                password,
                versionCode: versionCode.toString(),
                versionName: versionName,
                loginType // Send the selected login type
            });

            if (res.data.success) {
                logger.auth('[LoginScreen] Login success, calling signIn...');
                // Pass refresh token if provided by backend
                await signIn(
                    res.data.token,
                    res.data.user,
                    res.data.refreshToken // Optional refresh token
                );
                logger.auth('[LoginScreen] signIn returned');
            } else {
                logger.warn('[LoginScreen] Login failed logic:', res.data);
                Alert.alert('Login Gagal', res.data.error || 'Terjadi kesalahan');
            }
        } catch (error) {
            const isAxiosErr = error instanceof AxiosError;
            const status = isAxiosErr ? error.response?.status : undefined;
            logger.error('[LoginScreen] Login error:', status, isAxiosErr ? error.response?.data : error);

            if (status === 401) {
                Alert.alert('Login Gagal', 'Email atau password salah.');
            } else {
                const errIdx = getUserFriendlyError(error);
                Alert.alert(errIdx.title || 'Error', errIdx.message || 'Terjadi kesalahan');
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
            // For biometric login, we need stored credentials
            // This is a simplified version - in production, you'd store encrypted credentials
            // or use a different auth flow (like stored refresh token)
            Alert.alert(
                'Biometrik Berhasil',
                'Autentikasi berhasil. Silakan masukkan kredensial Anda untuk melanjutkan.',
                [{ text: 'OK' }]
            );
        } else if (result.error) {
            Alert.alert('Autentikasi Gagal', result.error);
        }
    }, []);

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-6`}>
            <StatusBar style="dark" />

            {/* Logo */}
            <View style={tw`mb-8 items-center`}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={tw`h-24 w-24 rounded-2xl mb-4`}
                    resizeMode="contain"
                />
                <Text style={tw`text-2xl font-bold text-gray-900`}>SBL NET</Text>
                <Text style={tw`text-gray-500 mt-1`}>
                    {loginType === 'EMPLOYEE' ? 'Employee Portal' : 'Customer Portal'}
                </Text>
            </View>

            <View style={tw`w-full max-w-sm`}>
                {/* Login Type Tabs */}
                <View style={tw`flex-row bg-gray-100 p-1 rounded-xl mb-6`}>
                    <TouchableOpacity
                        onPress={() => setLoginType('CUSTOMER')}
                        style={[
                            tw`flex-1 py-2.5 items-center rounded-lg`,
                            loginType === 'CUSTOMER' ? tw`bg-white shadow-sm` : tw`bg-transparent`
                        ]}
                    >
                        <Text style={[
                            tw`font-semibold text-sm`,
                            loginType === 'CUSTOMER' ? tw`text-blue-600` : tw`text-gray-500`
                        ]}>
                            Pelanggan
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setLoginType('EMPLOYEE')}
                        style={[
                            tw`flex-1 py-2.5 items-center rounded-lg`,
                            loginType === 'EMPLOYEE' ? tw`bg-white shadow-sm` : tw`bg-transparent`
                        ]}
                    >
                        <Text style={[
                            tw`font-semibold text-sm`,
                            loginType === 'EMPLOYEE' ? tw`text-blue-600` : tw`text-gray-500`
                        ]}>
                            Karyawan
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Email/Username Input with React Hook Form */}
                <FormInput
                    name="email"
                    control={control}
                    label={loginType === 'EMPLOYEE' ? "Email Address" : "ID Pelanggan (Username)"}
                    placeholder={loginType === 'EMPLOYEE' ? "nama@perusahaan.com" : "Contoh: budi123"}
                    keyboardType={loginType === 'EMPLOYEE' ? "email-address" : "default"}
                    autoCapitalize="none"
                    leftIcon={loginType === 'EMPLOYEE' ? <Mail color="#9ca3af" size={20} /> : <User color="#9ca3af" size={20} />}
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
            </View>
        </View>
    );
}
