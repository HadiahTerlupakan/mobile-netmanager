import { FormPasswordInput } from '@/components/atoms/FormPasswordInput';
import { ScreenErrorBoundary } from '@/components/atoms/ScreenErrorBoundary';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import api from '@/services/api';
import { getUserFriendlyError } from '@/utils/errorHandling';
import { ChangePasswordSchema } from '@/utils/validation';
import { router } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { z } from 'zod';

type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>;

function ChangePasswordScreen() {
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleValidatedSubmit,
        formState: { errors }
    } = useFormWithValidation({
        schema: ChangePasswordSchema,
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        }
    });

    const handleSave = handleValidatedSubmit(async (data: ChangePasswordFormData) => {
        setSaving(true);
        try {
            const res = await api.post('/api/mobile/profile/password', data);
            if (res.data.success) {
                Alert.alert('Sukses', 'Password berhasil diubah', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            const { title, message } = getUserFriendlyError(error);
            Alert.alert(title, message);
        } finally {
            setSaving(false);
        }
    });

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
                        <FormPasswordInput
                            name="currentPassword"
                            control={control}
                            label="Password Lama"
                            placeholder="Masukkan password lama"
                            error={errors.currentPassword?.message}
                        />
                    </View>

                    {/* New Password */}
                    <View style={tw`mb-4`}>
                        <FormPasswordInput
                            name="newPassword"
                            control={control}
                            label="Password Baru"
                            placeholder="Masukkan password baru"
                            hint="Minimal 6 karakter"
                            error={errors.newPassword?.message}
                        />
                    </View>

                    {/* Confirm Password */}
                    <View style={tw`mb-4`}>
                        <FormPasswordInput
                            name="confirmPassword"
                            control={control}
                            label="Konfirmasi Password Baru"
                            placeholder="Ulangi password baru"
                            error={errors.confirmPassword?.message}
                        />
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

export default function ChangePassword() {
    return (
        <ScreenErrorBoundary screenName="ChangePassword">
            <ChangePasswordScreen />
        </ScreenErrorBoundary>
    );
}
