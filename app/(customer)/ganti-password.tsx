import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import type { z } from 'zod';

import { FormPasswordInput } from '@/components/atoms/FormPasswordInput';
import { KepalaLayar } from '@/components/molecules/KepalaLayar';
import { pesanPenolakanIsian, useGantiPasswordPelanggan } from '@/hooks/queries/useAkunPelanggan';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import { presentSuccessMessage } from '@/utils/errorPresenter';
import { ChangePasswordSchema } from '@/utils/validation';

type NilaiGantiPassword = z.infer<typeof ChangePasswordSchema>;

/** Ganti password akun pelanggan; konfirmasi hanya diperiksa di aplikasi, tidak dikirim. */
export default function GantiPasswordPelangganScreen() {
  const router = useRouter();
  const { control, watch, handleValidatedSubmit, formState: { errors } } = useFormWithValidation({
    schema: ChangePasswordSchema,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const ganti = useGantiPasswordPelanggan((pesan) => {
    presentSuccessMessage(pesan ?? 'Password berhasil diubah');
    router.back();
  });
  const { reset: hapusPenolakan } = ganti;
  useEffect(() => {
    // Penolakan berlaku untuk isian yang dikirim; begitu isian berubah, pesannya basi.
    const langganan = watch(() => hapusPenolakan());
    return () => langganan.unsubscribe();
  }, [watch, hapusPenolakan]);
  const pesanPenolakan = pesanPenolakanIsian(ganti.error);
  const simpan = handleValidatedSubmit(({ currentPassword, newPassword }: NilaiGantiPassword) => {
    ganti.mutate({ currentPassword, newPassword });
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={['top']}>
      <KepalaLayar judul="Ganti Password" isKembaliNonaktif={ganti.isPending} />
      <ScrollView contentContainerStyle={tw`p-4`} keyboardShouldPersistTaps="handled">
        <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
          <View style={tw`mb-4`}>
            <FormPasswordInput name="currentPassword" control={control} label="Password Saat Ini" placeholder="Masukkan password saat ini" error={errors.currentPassword?.message} />
          </View>
          <View style={tw`mb-4`}>
            <FormPasswordInput name="newPassword" control={control} label="Password Baru" placeholder="Masukkan password baru" hint="Minimal 6 karakter" error={errors.newPassword?.message} />
          </View>
          <FormPasswordInput name="confirmPassword" control={control} label="Konfirmasi Password Baru" placeholder="Ulangi password baru" error={errors.confirmPassword?.message} />
        </View>
        {pesanPenolakan ? (
          <Text accessibilityRole="alert" style={tw`mt-4 text-sm text-red-500`}>
            {pesanPenolakan}
          </Text>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: ganti.isPending }}
          disabled={ganti.isPending}
          onPress={simpan}
          style={tw`mt-6 bg-teal-600 rounded-xl py-4 items-center ${ganti.isPending ? 'opacity-70' : ''}`}
        >
          {ganti.isPending ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-bold`}>Simpan Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
