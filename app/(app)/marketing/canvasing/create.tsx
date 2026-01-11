import { LocationPickerModal } from '@/components/marketing/LocationPickerModal';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, Image as ImageIcon, Info, Map as MapIcon, MapPin, Package, Settings, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
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
    const [form, setForm] = useState<{
        nama: string;
        noKtp: string;
        noTelpon: string;
        email: string;
        alamat: string;
        kabel: string;
        odp: string;
        paket: string;
        sn: string;
        shareloc: string;
        latitude?: number;
        longitude?: number;
    }>({
        nama: '',
        noKtp: '',
        noTelpon: '',
        email: '',
        alamat: '',
        kabel: '',
        odp: '',
        paket: '',
        sn: '',
        shareloc: '',
        latitude: undefined,
        longitude: undefined
    });

    const [fotoLocal, setFotoLocal] = useState<string | null>(null);
    const [fotoKtpLocal, setFotoKtpLocal] = useState<string | null>(null);
    const [showMapModal, setShowMapModal] = useState(false);

    const { mutate, isLoading: isMutating } = useOfflineMutation();

    // handleGetLocation removed in favor of Modal

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
                    allowsEditing: false,
                    quality: 0.7,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: false,
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

        if (!form.latitude || !form.longitude) {
            Alert.alert('Peringatan', 'Lokasi (Tikor) wajib diisi. Silakan pilih dari Map atau gunakan Link Shareloc agar lokasi akurat.');
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

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={tw`flex-1 bg-gray-50`}
        >
            {/* Header */}
            <View style={tw`bg-white pt-12 pb-4 px-4 shadow-sm z-10 flex-row items-center justify-between`}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={tw`w-10 h-10 items-center justify-center bg-gray-50 rounded-full`}
                >
                    <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-extrabold text-gray-900`}>Request Canvasing</Text>
                <View style={tw`w-10`} />
            </View>

            <ScrollView 
                style={tw`flex-1`}
                contentContainerStyle={tw`pb-32`}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Info */}
                <View style={tw`bg-blue-600 p-6 mb-2`}>
                    <Text style={tw`text-white text-xl font-black mb-1`}>Input Data Baru</Text>
                    <Text style={tw`text-blue-100 text-xs font-medium`}>Pastikan semua informasi pelanggan valid sebelum disimpan.</Text>
                </View>

                <View style={tw`px-4 pt-4`}>
                    
                    {/* Section: Dokumen & Foto */}
                    <FormSectionHeader title="Dokumen & Foto" icon={<MapPin size={16} color="#2563eb" />} />
                    <View style={tw`bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100`}>
                        <PhotoPickerField 
                            title="Foto Lokasi / Rumah" 
                            value={fotoLocal} 
                            onPick={(cam: boolean) => pickImage('foto', cam)} 
                            onRemove={() => setFotoLocal(null)}
                        />
                        <View style={tw`h-px bg-gray-50 my-4`} />
                        <PhotoPickerField 
                            title="Foto Kartu Identitas (KTP)" 
                            value={fotoKtpLocal} 
                            onPick={(cam: boolean) => pickImage('ktp', cam)} 
                            onRemove={() => setFotoKtpLocal(null)}
                            required
                        />
                    </View>

                    {/* Section: Data Pelanggan */}
                    <FormSectionHeader title="Informasi Pelanggan" icon={<User size={16} color="#2563eb" />} />
                    <View style={tw`bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100`}>
                        <InputField 
                            label="Nama Lengkap Sesuai KTP" 
                            placeholder="Contoh: Budi Santoso" 
                            value={form.nama}
                            onChangeText={(text: string) => setForm({...form, nama: text})}
                            required
                        />
                        <InputField 
                            label="NIK (16 Digit)" 
                            placeholder="320..." 
                            value={form.noKtp}
                            onChangeText={(text: string) => setForm({...form, noKtp: text})}
                            keyboardType="numeric"
                            maxLength={16}
                            required
                        />
                        <InputField 
                            label="Email" 
                            placeholder="nama@email.com" 
                            value={form.email}
                            onChangeText={(text: string) => setForm({...form, email: text})}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <InputField 
                            label="Nomor WhatsApp" 
                            placeholder="08..." 
                            value={form.noTelpon}
                            onChangeText={(text: string) => setForm({...form, noTelpon: text})}
                            keyboardType="phone-pad"
                            required
                        />
                        <InputField 
                            label="Alamat Lengkap" 
                            placeholder="Jalan, No Rumah, RT/RW..." 
                            value={form.alamat}
                            onChangeText={(text: string) => setForm({...form, alamat: text})}
                            multiline
                            required
                        />
                    </View>

                    {/* Section: Teknis & Paket */}
                    <FormSectionHeader title="Detail Teknis & Layanan" icon={<Settings size={16} color="#2563eb" />} />
                    <View style={tw`bg-white rounded-3xl p-5 mb-8 shadow-sm border border-gray-100`}>
                        <InputField 
                            label="Pilihan Paket Internet" 
                            placeholder="Contoh: HOME 20 MBps" 
                            value={form.paket}
                            onChangeText={(text: string) => setForm({...form, paket: text})}
                            required
                        />
                        <View style={tw`flex-row gap-4`}>
                            <View style={tw`flex-1`}>
                                <InputField 
                                    label="Est. Kabel (M)" 
                                    placeholder="0" 
                                    value={form.kabel}
                                    onChangeText={(text: string) => setForm({...form, kabel: text})}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={tw`flex-1`}>
                                <InputField 
                                    label="Nama ODP" 
                                    placeholder="ODP-..." 
                                    value={form.odp}
                                    onChangeText={(text: string) => setForm({...form, odp: text})}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <View style={tw`mb-5`}>
                            <Text style={tw`text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 ml-1`}>
                                Link Shareloc (Google Maps)
                            </Text>
                            <View style={tw`flex-row gap-2 mb-2`}>
                                <TextInput
                                    style={tw`flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-900 font-bold`}
                                    placeholder="https://maps.google.com/..."
                                    placeholderTextColor="#d1d5db"
                                    value={form.shareloc}
                                    onChangeText={(text: string) => {
                                        // Try to parse lat/long from URL
                                        let lat = form.latitude;
                                        let lng = form.longitude;
                                        
                                        // Regex for standard maps link with q=lat,lng or @lat,lng
                                        const regex = /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/;
                                        const match = text.match(regex);
                                        
                                        if (match) {
                                            const [coords] = match;
                                            const [l, g] = coords.split(',').map(s => parseFloat(s.trim()));
                                            if (!isNaN(l) && !isNaN(g)) {
                                                lat = l;
                                                lng = g;
                                            }
                                        }

                                        setForm({...form, shareloc: text, latitude: lat, longitude: lng});
                                    }}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowMapModal(true)}
                                    style={tw`bg-blue-50 border border-blue-100 rounded-2xl px-4 items-center justify-center`}
                                >
                                    <MapIcon size={20} color="#2563eb" />
                                </TouchableOpacity>
                            </View>
                            {/* Coordinate Indicator */}
                            <View style={tw`flex-row items-center ml-1`}>
                                <View style={tw`w-2 h-2 rounded-full ${form.latitude ? 'bg-emerald-500' : 'bg-gray-300'} mr-2`} />
                                <Text style={tw`text-[10px] font-bold ${form.latitude ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {form.latitude && form.longitude 
                                        ? `Tikor: ${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                                        : 'Koordinat belum terdeteksi (Pilih Map / Paste Link)'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSubmit}
                        disabled={isLoading || isMutating}
                        style={tw`bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-200 flex-row items-center justify-center ${isLoading || isMutating ? 'opacity-50' : ''}`}
                    >
                        {isLoading || isMutating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Package size={20} color="white" />
                                <Text style={tw`text-white font-black text-base ml-3`}>Submit Request</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Hint */}
                    <View style={tw`flex-row items-center justify-center mt-6`}>
                        <Info size={14} color="#9ca3af" />
                        <Text style={tw`text-gray-400 text-[10px] font-bold uppercase ml-2 tracking-widest`}>
                            (*) Wajib diisi dengan benar
                        </Text>
                    </View>

                </View>
            </ScrollView>

            <LocationPickerModal 
                visible={showMapModal}
                onClose={() => setShowMapModal(false)}
                onSelectLocation={(lat, lng) => {
                    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    setForm(prev => ({ 
                        ...prev, 
                        shareloc: mapsUrl,
                        latitude: lat,
                        longitude: lng
                    }));
                    setShowMapModal(false);
                }}
            />
        </KeyboardAvoidingView>
    );
}

function FormSectionHeader({ title, icon }: any) {
    return (
        <View style={tw`flex-row items-center mb-4 ml-1`}>
            <View style={tw`w-8 h-8 bg-blue-50 items-center justify-center rounded-xl mr-3`}>
                {icon}
            </View>
            <Text style={tw`text-base font-black text-gray-900`}>{title}</Text>
        </View>
    );
}

function InputField({ label, placeholder, value, onChangeText, required, ...props }: any) {
    return (
        <View style={tw`mb-5`}>
            <Text style={tw`text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 ml-1`}>
                {label} {required && <Text style={tw`text-rose-500`}>*</Text>}
            </Text>
            <TextInput
                style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-900 font-bold`}
                placeholder={placeholder}
                placeholderTextColor="#d1d5db"
                value={value}
                onChangeText={onChangeText}
                {...props}
            />
        </View>
    );
}

function PhotoPickerField({ title, value, onPick, onRemove, required }: any) {
    return (
        <View>
            <Text style={tw`text-[10px] text-gray-400 font-black uppercase tracking-widest mb-3 ml-1`}>
                {title} {required && <Text style={tw`text-rose-500`}>*</Text>}
            </Text>
            {value ? (
                <View style={tw`bg-gray-50 p-2 rounded-3xl border border-gray-100`}>
                    <View style={tw`relative rounded-2xl overflow-hidden aspect-video bg-gray-200`}>
                        <Image source={{ uri: value }} style={tw`w-full h-full`} />
                        <TouchableOpacity 
                            onPress={onRemove}
                            style={tw`absolute top-3 right-3 bg-black/40 w-10 h-10 items-center justify-center rounded-full`}
                        >
                            <X size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={tw`flex-row gap-3`}>
                    <TouchableOpacity 
                        onPress={() => onPick(true)}
                        activeOpacity={0.7}
                        style={tw`flex-1 h-20 items-center justify-center bg-blue-50/50 border border-dashed border-blue-200 rounded-2xl gap-2`}
                    >
                        <View style={tw`bg-blue-100 p-2 rounded-lg`}>
                            <Camera size={18} color="#2563eb" />
                        </View>
                        <Text style={tw`text-blue-600 text-[10px] font-black uppercase`}>Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => onPick(false)}
                        activeOpacity={0.7}
                        style={tw`flex-1 h-20 items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl gap-2`}
                    >
                        <View style={tw`bg-gray-100 p-2 rounded-lg`}>
                            <ImageIcon size={18} color="#6b7280" />
                        </View>
                        <Text style={tw`text-gray-500 text-[10px] font-black uppercase`}>Galeri</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

