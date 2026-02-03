import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api'; // Use centralized API
import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Lock, Save } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function ChangePassword() {
    const { token } = useAuth();
    const [saving, setSaving] = useState(false);
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Semua field harus diisi');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Password baru dan konfirmasi tidak cocok');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password minimal 6 karakter');
            return;
        }

        setSaving(true);
        try {
            const res = await api.post(
                '/api/mobile/profile/password',
                { currentPassword, newPassword, confirmPassword }
            );
            if (res.data.success) {
                Alert.alert('Sukses', 'Password berhasil diubah', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Gagal mengubah password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-200`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2`}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`flex-1 text-lg font-bold text-gray-800 ml-2`}>Ganti Password</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4`}>
                {/* Info */}
                <View style={tw`bg-blue-50 rounded-xl p-4 mb-6`}>
                    <Text style={tw`text-blue-800 text-sm`}>
                        Untuk keamanan, masukkan password lama Anda sebelum mengubah ke password baru.
                    </Text>
                </View>

                {/* Form */}
                <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
                    {/* Current Password */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Password Lama</Text>
                        <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                            <Lock size={20} color="#6b7280" />
                            <TextInput
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Masukkan password lama"
                                secureTextEntry={!showCurrent}
                                style={tw`flex-1 py-3 px-3 text-gray-800`}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                {showCurrent ? (
                                    <EyeOff size={20} color="#6b7280" />
                                ) : (
                                    <Eye size={20} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* New Password */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Password Baru</Text>
                        <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                            <Lock size={20} color="#6b7280" />
                            <TextInput
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Masukkan password baru"
                                secureTextEntry={!showNew}
                                style={tw`flex-1 py-3 px-3 text-gray-800`}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                {showNew ? (
                                    <EyeOff size={20} color="#6b7280" />
                                ) : (
                                    <Eye size={20} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text style={tw`text-xs text-gray-400 mt-1`}>Minimal 6 karakter</Text>
                    </View>

                    {/* Confirm Password */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Konfirmasi Password Baru</Text>
                        <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                            <Lock size={20} color="#6b7280" />
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Ulangi password baru"
                                secureTextEntry={!showConfirm}
                                style={tw`flex-1 py-3 px-3 text-gray-800`}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? (
                                    <EyeOff size={20} color="#6b7280" />
                                ) : (
                                    <Eye size={20} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={tw`mt-6 bg-blue-600 rounded-xl py-4 flex-row items-center justify-center ${saving ? 'opacity-50' : ''}`}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Save size={20} color="#fff" />
                            <Text style={tw`text-white font-bold ml-2`}>Simpan Password</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
