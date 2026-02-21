import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { canvasingService } from '@/services/CanvasingService'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'

export default function CanvasingCompleteScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sn, setSn] = useState('')
  const [fotoUri, setFotoUri] = useState<string | null>(null)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Akses kamera dibutuhkan')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    })
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri)
    }
  }

  const submit = async () => {
    if (!fotoUri) {
      Alert.alert('Error', 'Foto bukti instalasi (modem/pendampingan) wajib diunggah')
      return
    }

    setLoading(true)
    try {
      // NOTE: Here you would normally upload the image first using your UploadService
      // const uploadedFotoUrl = await uploadService.upload(fotoUri, 'marketing')

      await canvasingService.completeCanvasing(id as string, {
        fotoInstalasi: fotoUri, // Replace with uploadedFotoUrl
        sn
      })
      
      Alert.alert('Sukses', 'Laporan instalasi berhasil dikirim', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      Alert.alert('Error', 'Gagal mengirim laporan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold text-gray-800 mb-6">Laporan Instalasi Selesai</Text>
        
        <Text className="text-sm text-gray-600 mb-1">Serial Number (SN) Modem / ONT</Text>
        <TextInput 
          className="border border-gray-300 rounded-lg p-3 mb-6 bg-gray-50"
          value={sn}
          onChangeText={setSn}
          placeholder="Contoh: ZTEG123456"
          autoCapitalize="characters"
        />

        <Text className="text-sm text-gray-600 mb-1">Foto Bukti Instalasi *</Text>
        <TouchableOpacity 
          className="items-center justify-center border border-dashed border-gray-400 rounded-lg p-6 mb-8 bg-gray-50"
          onPress={pickImage}
        >
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} className="w-full h-40 rounded-lg" resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#6b7280" />
              <Text className="text-gray-500 mt-2">Ambil Foto Modem / Lokasi</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ backgroundColor: '#2563eb' }}
          className="p-4 rounded-xl items-center mb-8"
          onPress={submit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan & Selesai</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}
