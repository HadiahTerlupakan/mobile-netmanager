import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import tw from 'twrnc';

export default function CreateCanvasingScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({
        nama: '',
        noKtp: '',
        noTelpon: '',
        email: '',
        alamat: '',
        kabel: '',
        odp: '',
        paket: '',
        sn: '',
        shareloc: ''
    });

    const [fotoLocal, setFotoLocal] = useState<string | null>(null);
    const [fotoKtpLocal, setFotoKtpLocal] = useState<string | null>(null);

    const { mutate, isLoading: isMutating } = useOfflineMutation();


    const pickImage = async (type: 'foto' | 'ktp', useCamera: boolean = false) => {
        try {
            const permissionResult = useCamera 
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert('Izin Ditolak', `Aplikasi butuh izin ${useCamera ? 'kamera' : 'galeri'} untuk mengambil foto.`);
                return;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.7,
                });

            if (!result.canceled) {
                const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                
                if (type === 'foto') setFotoLocal(manipulated.uri);
                else setFotoKtpLocal(manipulated.uri);
            }
        } catch (error) {
            console.error('Pick image error:', error);
            Alert.alert('Error', 'Gagal memproses gambar');
        }
    };

    const handleSubmit = async () => {
        if (!form.nama || !form.noKtp || !form.noTelpon || !form.alamat || !form.paket) {
            Alert.alert('Peringatan', 'Mohon lengkapi data yang wajib diisi (*)');
            return;
        }

        if (!fotoKtpLocal) {
            Alert.alert('Peringatan', 'Foto KTP wajib diunggah');
            return;
        }

        setIsLoading(true);
        try {
            const kabelNum = parseInt(form.kabel);
            
            const photoMap: Record<string, string> = {};
            if (fotoLocal) photoMap['foto'] = fotoLocal;
            if (fotoKtpLocal) photoMap['fotoKtp'] = fotoKtpLocal;

            await mutate(
                { 
                    ...form, 
                    kabel: isNaN(kabelNum) ? 0 : kabelNum,
                    meta: {
                        photoMap,
                        photoType: 'marketing'
                    }
                },
                {
                    url: '/api/marketing/canvasing',
                    method: 'POST',
                    onSuccess: () => {
                         Alert.alert('Berhasil', 'Data canvasing berhasil disimpan', [
                             { text: 'OK', onPress: () => router.back() }
                         ]);
                    },
                    onError: (err) => {
                        Alert.alert('Gagal', err.message || 'Terjadi kesalahan saat menyimpan data');
                    }
                }
            );
        } finally {
            setIsLoading(false);
        }
    };

    const PhotoSection = ({ title, value, onPick, onRemove, required }: any) => (
        <View style={tw`mb-4`}>
            <Text style={tw`text-sm font-semibold text-gray-700 mb-2`}>
                {title} {required && <Text style={tw`text-red-500`}>*</Text>}
            </Text>
            {value ? (
                <View style={tw`relative rounded-xl overflow-hidden bg-gray-100`}>
                    <Image source={{ uri: value }} style={tw`w-full aspect-video`} />
                    <TouchableOpacity 
                        onPress={onRemove}
                        style={tw`absolute top-2 right-2 bg-black/50 p-2 rounded-full`}
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity 
                        onPress={() => onPick(true)}
                        style={tw`flex-1 flex-row items-center justify-center bg-gray-50 border border-dashed border-gray-300 p-4 rounded-xl gap-2`}
                    >
                        <Camera size={20} color="#6b7280" />
                        <Text style={tw`text-gray-600 text-xs font-medium`}>Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => onPick(false)}
                        style={tw`flex-1 flex-row items-center justify-center bg-gray-50 border border-dashed border-gray-300 p-4 rounded-xl gap-2`}
                    >
                        <ImageIcon size={20} color="#6b7280" />
                        <Text style={tw`text-gray-600 text-xs font-medium`}>Galeri</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={tw`flex-1 bg-white`}>
            <ScrollView style={tw`flex-1 p-4`} contentContainerStyle={tw`pb-10`}>
                <View style={tw`mb-6`}>
                    <Text style={tw`text-2xl font-bold text-gray-900`}>Tambah Canvasing</Text>
                    <Text style={tw`text-gray-500 mt-1`}>Isi data calon pelanggan baru</Text>
                </View>

                {/* Foto Section */}
                <PhotoSection 
                    title="Foto Lokasi / Rumah" 
                    value={fotoLocal} 
                    onPick={(cam: any) => pickImage('foto', cam)} 
                    onRemove={() => setFotoLocal(null)}
                />

                <PhotoSection 
                    title="Foto KTP" 
                    value={fotoKtpLocal} 
                    onPick={(cam: any) => pickImage('ktp', cam)} 
                    onRemove={() => setFotoKtpLocal(null)}
                    required
                />

                <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Nama Lengkap *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                        placeholder="Nama Sesuai KTP"
                        value={form.nama}
                        onChangeText={text => setForm({...form, nama: text})}
                    />
                </View>

                <View style={tw`flex-row gap-3 mb-4`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>NIK KTP *</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                            placeholder="16 Digit NIK"
                            keyboardType="numeric"
                            maxLength={16}
                            value={form.noKtp}
                            onChangeText={text => setForm({...form, noKtp: text})}
                        />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>No. HP *</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                            placeholder="081xxx"
                            keyboardType="phone-pad"
                            value={form.noTelpon}
                            onChangeText={text => setForm({...form, noTelpon: text})}
                        />
                    </View>
                </View>

                <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Alamat Pemasangan *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50 min-h-[80px]`}
                        placeholder="Alamat Lengkap"
                        multiline
                        textAlignVertical="top"
                        value={form.alamat}
                        onChangeText={text => setForm({...form, alamat: text})}
                    />
                </View>

                <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Paket Langganan *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                        placeholder="Contoh: HOME 30 MBps"
                        value={form.paket}
                        onChangeText={text => setForm({...form, paket: text})}
                    />
                </View>

                <View style={tw`flex-row gap-3 mb-4`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Est. Kabel (Meter)</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                            placeholder="0"
                            keyboardType="numeric"
                            value={form.kabel}
                            onChangeText={text => setForm({...form, kabel: text})}
                        />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>ODP Terdekat</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                            placeholder="Nama ODP"
                            autoCapitalize="characters"
                            value={form.odp}
                            onChangeText={text => setForm({...form, odp: text})}
                        />
                    </View>
                </View>

                <View style={tw`mb-4`}>
                    <Text style={tw`text-sm font-semibold text-gray-700 mb-1`}>Link Shareloc</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg p-3 text-base text-gray-900 bg-gray-50`}
                        placeholder="https://maps.google.com/..."
                        value={form.shareloc}
                        autoCapitalize="none"
                        onChangeText={text => setForm({...form, shareloc: text})}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    style={tw`bg-blue-600 p-4 rounded-xl shadow-sm items-center ${isLoading ? 'opacity-70' : ''}`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={tw`text-white font-bold text-base`}>Simpan Data</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
