import axios from 'axios';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Email dan Password harus diisi');
            return;
        }

        setLoading(true);
        try {
            const versionCode = Constants.expoConfig?.extra?.versionCode || 53;
            // Native version for APK (e.g. 1.0.7), fallback to 1.0.0
            const versionName = Constants.expoConfig?.version || '1.0.0';
            
            console.log('Attempting login to:', `${Config.API_URL}/api/mobile/auth/login`, 'Version:', versionCode, versionName);
            const res = await axios.post(`${Config.API_URL}/api/mobile/auth/login`, {
                email,
                password,
                versionCode: versionCode.toString(),
                versionName: versionName
            });

            if (res.data.success) {
                console.log('[LoginScreen] Login success, calling signIn...');
                await signIn(res.data.token, res.data.user);
                console.log('[LoginScreen] signIn returned');
            } else {
                console.log('[LoginScreen] Login failed logic:', res.data);
                Alert.alert('Login Gagal', res.data.error || 'Terjadi kesalahan');
            }
        } catch (error: any) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error('[LoginScreen] Login error:', status, data);
            
            // Handle different error scenarios
            if (error.response) {
                // Server responded with error - show the error message
                let errorMessage = 'Login gagal. Silakan coba lagi.';
                
                if (status === 401) {
                    // Invalid credentials - show friendly message
                    errorMessage = data?.error || 'Email atau password salah';
                } else if (status === 400) {
                    errorMessage = data?.error || 'Data tidak lengkap';
                } else if (status >= 500) {
                    errorMessage = 'Server sedang bermasalah. Coba lagi nanti.';
                } else if (data?.error) {
                    errorMessage = data.error;
                }
                
                console.log('[LoginScreen] Showing alert:', errorMessage);
                Alert.alert('Login Gagal', errorMessage);
            } else if (error.request) {
                // No response received (network error)
                console.log('[LoginScreen] Network error, showing alert');
                Alert.alert(
                    'Koneksi Gagal', 
                    'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
                );
            } else {
                // Other errors
                console.log('[LoginScreen] Unknown error, showing alert');
                Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-6`}>
            <StatusBar style="dark" />

            {/* Logo */}
            <View style={tw`mb-10 items-center`}>
                <Image 
                    source={require('../../assets/images/icon.png')} 
                    style={tw`h-24 w-24 rounded-2xl mb-4`}
                    resizeMode="contain"
                />
                <Text style={tw`text-2xl font-bold text-gray-900`}>SBL KARYAWAN</Text>
                <Text style={tw`text-gray-500 mt-1`}>Employee Portal App</Text>
            </View>

            <View style={tw`w-full max-w-sm`}>
                <View style={tw`mb-4`}>
                    <Text style={tw`mb-2 font-medium text-gray-700`}>Email Address</Text>
                    <View style={tw`flex-row items-center border border-gray-300 rounded-xl px-4 h-12 bg-gray-50 focus:border-blue-500`}>
                        <Mail color="#9ca3af" size={20} />
                        <TextInput
                            testID="email-input"
                            accessibilityLabel="Email Input"
                            style={tw`flex-1 ml-3 text-gray-900`}
                            placeholder="nama@perusahaan.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>
                </View>

                <View style={tw`mb-8`}>
                    <Text style={tw`mb-2 font-medium text-gray-700`}>Password</Text>
                    <View style={tw`flex-row items-center border border-gray-300 rounded-xl px-4 h-12 bg-gray-50 focus:border-blue-500`}>
                        <Lock color="#9ca3af" size={20} />
                        <TextInput
                            testID="password-input"
                            accessibilityLabel="Password Input"
                            style={tw`flex-1 ml-3 text-gray-900`}
                            placeholder="••••••••"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    style={tw`bg-blue-600 h-14 rounded-xl items-center justify-center shadow-md ${loading ? 'opacity-70' : ''}`}
                >
                    <Text style={tw`text-white font-bold text-lg`}>
                        {loading ? 'Memproses...' : 'Sign In'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
