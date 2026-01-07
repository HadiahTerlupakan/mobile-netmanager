import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, ChevronDown, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

const LEAVE_TYPES = [
    { value: 'SAKIT', label: 'Sakit' },
    { value: 'CUTI', label: 'Cuti' },
    { value: 'IZIN', label: 'Izin' },
    { value: 'TUKAR_LIBUR', label: 'Tukar Libur' },
    { value: 'LAINNYA', label: 'Lainnya' },
];

export default function LeaveFormScreen() {
    const router = useRouter();
    
    // Form State
    const [type, setType] = useState('SAKIT');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [replacementDate, setReplacementDate] = useState(new Date()); // New State
    const [reason, setReason] = useState('');
    const [photos, setPhotos] = useState<string[]>([]);
    
    // UI State
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showReplacementPicker, setShowReplacementPicker] = useState(false); // New Picker

    // Camera
    const [showCamera, setShowCamera] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    // Offline Mutation
    const { mutate, isLoading: isSubmitting } = useOfflineMutation();

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Removed pickImageFromGallery as CameraModal handles it.

    // Submit
    const handleSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert('Error', 'Alasan wajib diisi');
            return;
        }
        if (type !== 'CUTI' && type !== 'TUKAR_LIBUR' && photos.length === 0) {
            Alert.alert('Error', 'Foto bukti wajib diupload');
            return;
        }

        await mutate({
             type,
             startDate: startDate.toISOString(),
             endDate: endDate.toISOString(),
             replacementDate: type === 'TUKAR_LIBUR' ? replacementDate.toISOString() : undefined, // Bind replacementDate
             reason: reason.trim(),
             photos: [], 
             meta: {
                 photos: photos,
                 targetField: 'photos',
                 singleFile: false,
                 photoType: 'employee-leave'
             }
        }, {
             url: `/api/mobile/leaves`,
             method: 'POST',
             onSuccess: (data, isOffline) => {
                  Alert.alert(
                      isOffline ? 'Offline' : 'Sukses', 
                      isOffline ? 'Pengajuan diantrikan' : 'Pengajuan berhasil dikirim',
                      [{ text: 'OK', onPress: () => router.back() }]
                  );
             },
             onError: (err) => Alert.alert('Error', err.message || 'Gagal mengirim pengajuan')
        });
    };

    // Camera Modal Callback - REMOVED

    const handleImageSelection = () => {
        Alert.alert(
            'Pilih Sumber Foto',
            'Ambil foto dari kamera atau pilih dari galeri?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Kamera',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ['images'],
                                allowsEditing: false,
                                quality: 0.5,
                            });
                            if (!result.canceled) setPhotos(prev => [...prev, result.assets[0].uri]);
                        } catch (error) {
                             Alert.alert('Error', 'Gagal membuka kamera');
                        }
                    }
                },
                {
                    text: 'Galeri',
                    onPress: async () => {
                        try {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'],
                                allowsEditing: false,
                                quality: 0.5,
                            });
                            if (!result.canceled) setPhotos(prev => [...prev, result.assets[0].uri]);
                        } catch (error) {
                             Alert.alert('Error', 'Gagal membuka galeri');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            {/* Header */}
            <View style={tw`px-6 py-4 flex-row items-center bg-white border-b border-gray-100`}>
                <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}>
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold text-slate-900 ml-4`}>Form Pengajuan</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-6 pb-24`} showsVerticalScrollIndicator={false}>
                {/* Type Picker */}
                <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>Tipe Izin</Text>
                    <TouchableOpacity
                        onPress={() => setShowTypePicker(!showTypePicker)}
                        style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200 flex-row justify-between items-center`}
                        disabled={isSubmitting}
                    >
                        <Text style={tw`text-slate-800`}>{LEAVE_TYPES.find(t => t.value === type)?.label}</Text>
                        <ChevronDown size={20} color="#64748b" />
                    </TouchableOpacity>
                    {showTypePicker && (
                        <View style={tw`bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden`}>
                            {LEAVE_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t.value}
                                    onPress={() => { setType(t.value); setShowTypePicker(false); }}
                                    style={tw`p-3 border-b border-gray-100 ${type === t.value ? 'bg-teal-50' : ''}`}
                                >
                                    <Text style={tw`${type === t.value ? 'text-teal-600 font-bold' : 'text-slate-700'}`}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Date Pickers */}
                <View style={tw`flex-row gap-3 mb-4`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>
                            {type === 'TUKAR_LIBUR' ? 'Tanggal Izin (Mau Libur)' : 'Dari'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowStartPicker(true)}
                            style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200`}
                            disabled={isSubmitting}
                        >
                            <Text style={tw`text-slate-800`}>{format(startDate, 'dd/MM/yyyy')}</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Hide End Date for TUKAR_LIBUR - Single Day Logic */}
                    {type !== 'TUKAR_LIBUR' && (
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>Sampai</Text>
                            <TouchableOpacity
                                onPress={() => setShowEndPicker(true)}
                                style={tw`bg-gray-50 p-3 rounded-xl border border-gray-200`}
                                disabled={isSubmitting}
                            >
                                <Text style={tw`text-slate-800`}>{format(endDate, 'dd/MM/yyyy')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {showStartPicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        onChange={(_, date) => { 
                            setShowStartPicker(false); 
                            if (date) { 
                                setStartDate(date); 
                                // For TUKAR_LIBUR or auto-range convenience, sync end date initially
                                if (type === 'TUKAR_LIBUR' || endDate < date) {
                                    setEndDate(date);
                                }
                            } 
                        }}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        onChange={(_, date) => { setShowEndPicker(false); if (date) setEndDate(date); }}
                    />
                )}

                {/* Replacement Date for TUKAR_LIBUR */}
                {type === 'TUKAR_LIBUR' && (
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-xs font-bold text-teal-600 uppercase mb-2`}>Tanggal Pengganti (Wajib Masuk)</Text>
                        <TouchableOpacity
                            onPress={() => setShowReplacementPicker(true)}
                            style={tw`bg-teal-50 p-3 rounded-xl border border-teal-200`}
                            disabled={isSubmitting}
                        >
                            <Text style={tw`text-teal-800 font-bold`}>{format(replacementDate, 'dd MMMM yyyy')}</Text>
                        </TouchableOpacity>
                        <Text style={tw`text-xs text-gray-500 mt-1 italic`}>*Pilih tanggal di mana Anda bersedia masuk kerja.</Text>
                    </View>
                )}

                {showReplacementPicker && (
                    <DateTimePicker
                        value={replacementDate}
                        mode="date"
                        onChange={(_, date) => { setShowReplacementPicker(false); if (date) setReplacementDate(date); }}
                    />
                )}

                {/* Reason */}
                <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>Alasan</Text>
                    <TextInput
                        style={[tw`bg-gray-50 p-3 rounded-xl border border-gray-200`, { minHeight: 120, textAlignVertical: 'top' }]}
                        placeholder="Jelaskan alasan pengajuan secara rinci..."
                        multiline
                        value={reason}
                        onChangeText={setReason}
                        placeholderTextColor="#94a3b8"
                        editable={!isSubmitting}
                    />
                </View>

                {/* Photo Upload (required for non-CUTI) */}
                {type !== 'CUTI' && (
                    <View style={tw`mb-6`}>
                        <Text style={tw`text-xs font-bold text-slate-500 uppercase mb-2`}>Foto Bukti (Wajib)</Text>
                        
                        {/* Photo Grid */}
                        {photos.length > 0 && (
                            <View style={tw`flex-row flex-wrap gap-2 mb-3`}>
                                {photos.map((photo, idx) => (
                                    <View key={idx} style={tw`relative`}>
                                        <Image source={{ uri: photo }} style={tw`w-24 h-24 rounded-lg bg-gray-100`} />
                                        <TouchableOpacity
                                            onPress={() => removePhoto(idx)}
                                            style={tw`absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border border-white`}
                                            disabled={isSubmitting}
                                        >
                                            <X size={14} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Add Photo Buttons */}
                        <TouchableOpacity
                            onPress={handleImageSelection}
                            style={tw`bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-24 items-center justify-center active:bg-gray-100`}
                            disabled={isSubmitting}
                        >
                            <Camera size={28} color="#64748b" />
                            <Text style={tw`text-slate-500 text-sm mt-1 font-medium`}>
                                {photos.length > 0 ? 'Tambah Foto Lain' : 'Ambil Foto'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Submit All */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting || (type !== 'CUTI' && photos.length === 0) || !reason.trim()}
                    style={[
                        tw`py-4 rounded-xl items-center shadow-sm`,
                        (isSubmitting || (type !== 'CUTI' && photos.length === 0) || !reason.trim()) ? tw`bg-gray-300` : tw`bg-teal-600`
                    ]}
                >
                    <Text style={tw`text-white font-bold text-lg`}>
                        {isSubmitting ? 'Memproses...' : 'Kirim Pengajuan'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Loading Overlay - Full Screen with Dark Dim */}
            {isSubmitting && (
                <View style={tw`absolute inset-0 bg-black/60 items-center justify-center z-50`}>
                    <View style={tw`bg-white p-6 rounded-2xl items-center w-3/4 max-w-sm shadow-xl`}>
                        <ActivityIndicator size={48} color="#0d9488" />
                        <Text style={tw`text-slate-800 font-bold mt-4 text-lg text-center`}>Mengirim Pengajuan</Text>
                        <Text style={tw`text-slate-500 text-sm mt-2 text-center`}>Mohon tunggu sebentar, foto sedang diupload...</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
