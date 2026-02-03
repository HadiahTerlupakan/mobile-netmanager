import { Config } from '@/constants/Config';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api'; // Use centralized API
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft, Camera, ChevronDown, ChevronUp, Eye, EyeOff, Lock, Phone, Save, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface ProfileData {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
}

export default function EditProfile() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    
    // Password section
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/api/mobile/profile');
            if (res.data.success) {
                setProfile(res.data.data);
                setName(res.data.data.name || '');
                setPhone(res.data.data.phone || '');
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.patch(
                '/api/mobile/profile',
                { name, phone }
            );
            if (res.data.success) {
                Alert.alert('Sukses', 'Profil berhasil diperbarui');
                router.back();
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Semua field password harus diisi');
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

        setChangingPassword(true);
        try {
            const res = await api.post(
                '/api/mobile/profile/password',
                { currentPassword, newPassword, confirmPassword }
            );
            if (res.data.success) {
                Alert.alert('Sukses', 'Password berhasil diubah');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordSection(false);
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Gagal mengubah password');
        } finally {
            setChangingPassword(false);
        }
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Izin Diperlukan', 'Izinkan akses ke galeri untuk memilih foto');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri: string) => {
        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            formData.append('photo', {
                uri,
                name: filename,
                type,
            } as any);

            const res = await api.post(
                '/api/mobile/profile/photo',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (res.data.success) {
                setProfile(prev => prev ? { ...prev, image: res.data.data.image } : null);
                Alert.alert('Sukses', 'Foto berhasil diperbarui');
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Gagal upload foto');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    if (loading) {
        return (
            <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center`}>
                <ActivityIndicator size="large" color="#2563eb" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-200`}>
                <TouchableOpacity onPress={() => router.back()} style={tw`p-2`}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text style={tw`flex-1 text-lg font-bold text-gray-800 ml-2`}>Edit Profil</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
                {/* Photo Section */}
                <View style={tw`items-center mb-6`}>
                    <View style={tw`relative`}>
                        {profile?.image ? (
                            <Image
                                source={{ uri: profile.image }}
                                style={tw`w-28 h-28 rounded-full`}
                                contentFit="cover"
                                transition={1000}
                                  />
                        ) : (
                            <View style={tw`w-28 h-28 rounded-full bg-blue-100 items-center justify-center`}>
                                <Text style={tw`text-blue-600 text-4xl font-bold`}>
                                    {getInitials(profile?.name)}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={pickImage}
                            disabled={uploadingPhoto}
                            style={tw`absolute bottom-0 right-0 bg-blue-600 rounded-full p-3 shadow-lg`}
                        >
                            {uploadingPhoto ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Camera size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={tw`text-gray-500 text-sm mt-2`}>Ketuk untuk mengubah foto</Text>
                </View>

                {/* Profile Form */}
                <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
                    <Text style={tw`text-base font-bold text-gray-800 mb-4`}>Informasi Profil</Text>
                    
                    {/* Name */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Nama</Text>
                        <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                            <User size={20} color="#6b7280" />
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Masukkan nama"
                                style={tw`flex-1 py-3 px-3 text-gray-800`}
                            />
                        </View>
                    </View>

                    {/* Phone */}
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Nomor Telepon</Text>
                        <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                            <Phone size={20} color="#6b7280" />
                            <TextInput
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Masukkan nomor telepon"
                                keyboardType="phone-pad"
                                style={tw`flex-1 py-3 px-3 text-gray-800`}
                            />
                        </View>
                    </View>

                    {/* Email (read-only) */}
                    <View>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Email</Text>
                        <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3 bg-gray-50`}>
                            <TextInput
                                value={profile?.email || ''}
                                editable={false}
                                style={tw`flex-1 py-3 px-3 text-gray-500`}
                            />
                        </View>
                        <Text style={tw`text-xs text-gray-400 mt-1`}>Email tidak dapat diubah</Text>
                    </View>
                </View>

                {/* Password Section */}
                <View style={tw`bg-white rounded-xl shadow-sm mb-4 overflow-hidden`}>
                    <TouchableOpacity 
                        onPress={() => setShowPasswordSection(!showPasswordSection)}
                        style={tw`flex-row items-center justify-between p-4`}
                    >
                        <View style={tw`flex-row items-center`}>
                            <Lock size={20} color="#6b7280" />
                            <Text style={tw`text-base font-bold text-gray-800 ml-3`}>Ganti Password</Text>
                        </View>
                        {showPasswordSection ? (
                            <ChevronUp size={20} color="#6b7280" />
                        ) : (
                            <ChevronDown size={20} color="#6b7280" />
                        )}
                    </TouchableOpacity>
                    
                    {showPasswordSection && (
                        <View style={tw`px-4 pb-4`}>
                            <View style={tw`bg-blue-50 rounded-lg p-3 mb-4`}>
                                <Text style={tw`text-blue-800 text-xs`}>
                                    Masukkan password lama untuk mengubah password
                                </Text>
                            </View>

                            {/* Current Password */}
                            <View style={tw`mb-3`}>
                                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Password Lama</Text>
                                <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                                    <TextInput
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Password lama"
                                        secureTextEntry={!showCurrent}
                                        style={tw`flex-1 py-3 text-gray-800`}
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                        {showCurrent ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* New Password */}
                            <View style={tw`mb-3`}>
                                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Password Baru</Text>
                                <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                                    <TextInput
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Password baru (min 6 karakter)"
                                        secureTextEntry={!showNew}
                                        style={tw`flex-1 py-3 text-gray-800`}
                                    />
                                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                        {showNew ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Confirm Password */}
                            <View style={tw`mb-4`}>
                                <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Konfirmasi Password</Text>
                                <View style={tw`flex-row items-center border border-gray-300 rounded-lg px-3`}>
                                    <TextInput
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Ulangi password baru"
                                        secureTextEntry={!showConfirm}
                                        style={tw`flex-1 py-3 text-gray-800`}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                        {showConfirm ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                                style={tw`bg-gray-800 rounded-lg py-3 flex-row items-center justify-center ${changingPassword ? 'opacity-50' : ''}`}
                            >
                                {changingPassword ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={tw`text-white font-bold`}>Ubah Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={tw`bg-blue-600 rounded-xl py-4 flex-row items-center justify-center ${saving ? 'opacity-50' : ''}`}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Save size={20} color="#fff" />
                            <Text style={tw`text-white font-bold ml-2`}>Simpan Profil</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
