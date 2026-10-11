import { ArrowLeft, Save } from 'lucide-react-native';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { FormPasswordInput } from '@/components/atoms/FormPasswordInput';
import { useMutation } from '@/hooks/queries';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import api from '@/services/api';
import { useTemaPersona } from '@/theme';
import { presentAppError, presentSuccessMessage } from '@/utils/errorPresenter';
import { ChangePasswordSchema } from '@/utils/validation';

type DataFormGantiPassword = z.infer<typeof ChangePasswordSchema>;

interface FormGantiPasswordProps {
  /** Endpoint per jenis akun: karyawan dan investor memakai jalur berbeda. */
  endpoint: string;
  /** Dipakai pelaporan galat agar jejaknya jelas per layar. */
  namaLayar: string;
  rute: string;
}

/**
 * Form ganti password yang dipakai bersama layar karyawan dan investor.
 * Isinya sama persis; yang berbeda hanya endpoint, karena token investor
 * beraudience sendiri dan ditolak endpoint profil karyawan.
 */
export function FormGantiPassword({ endpoint, namaLayar, rute }: FormGantiPasswordProps) {
  const { tw } = useTemaPersona();
  const {
    control,
    handleValidatedSubmit,
    formState: { errors },
  } = useFormWithValidation({
    schema: ChangePasswordSchema,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Ganti password sensitif → plain useMutation (tanpa offline-queue).
  const mutasi = useMutation({
    mutationFn: (data: DataFormGantiPassword) => api.post(endpoint, data),
    onSuccess: (res) => {
      if (res.data.success) {
        presentSuccessMessage('Password berhasil diubah');
        router.back();
      }
    },
    onError: (error) => {
      presentAppError(error, { screen: namaLayar, route: rute });
    },
  });
  const menyimpan = mutasi.isPending;

  const simpan = handleValidatedSubmit((data: DataFormGantiPassword) => {
    mutasi.mutate(data);
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-row items-center px-4 py-3 bg-white border-b border-gray-200`}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
          style={tw`p-2`}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={tw`flex-1 text-lg font-bold text-gray-800 ml-2`}>Ganti Password</Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-4`}>
        <View style={tw`bg-utama-sangat-muda rounded-xl p-4 mb-6`}>
          <Text style={tw`text-utama-pekat text-sm`}>
            Untuk keamanan, masukkan password lama Anda sebelum mengubah ke password baru. Setelah
            berhasil, Anda akan diminta masuk lagi dengan password baru.
          </Text>
        </View>

        <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
          <View style={tw`mb-4`}>
            <FormPasswordInput
              name="currentPassword"
              control={control}
              label="Password Lama"
              placeholder="Masukkan password lama"
              error={errors.currentPassword?.message}
            />
          </View>
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

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Simpan Password"
          onPress={simpan}
          disabled={menyimpan}
          style={tw`mt-6 bg-utama-kuat rounded-xl py-4 flex-row items-center justify-center ${menyimpan ? 'opacity-50' : ''}`}
        >
          {menyimpan ? (
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
