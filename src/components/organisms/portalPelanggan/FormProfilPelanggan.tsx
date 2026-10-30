import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';
import type { z } from 'zod';

import { FormInput } from '@/components/atoms/FormInput';
import { useUbahProfilPelanggan } from '@/hooks/queries/useAkunPelanggan';
import { useFormWithValidation } from '@/hooks/useFormWithValidation';
import type { ProfilPelanggan } from '@/types/portalPelanggan';
import { presentSuccessMessage } from '@/utils/errorPresenter';
import { ProfilPelangganSchema } from '@/utils/validation';

import { SakelarPreferensi } from './SakelarPreferensi';

type NilaiProfil = z.infer<typeof ProfilPelangganSchema>;

const UKURAN_IKON_TELEPON = 18;
/** gray-400 */
const WARNA_IKON_TELEPON = '#9ca3af';

/** Form nomor telepon & preferensi notifikasi, diisi awal dari profil server. */
export function FormProfilPelanggan({ profil }: { profil: ProfilPelanggan }) {
  const router = useRouter();
  const { control, handleValidatedSubmit, formState: { errors } } = useFormWithValidation<NilaiProfil>({
    schema: ProfilPelangganSchema,
    defaultValues: {
      noTelp: profil.noTelp ?? '',
      isBillNotifEnabled: profil.preferences.isBillNotifEnabled,
      isPromoEnabled: profil.preferences.isPromoEnabled,
    },
  });
  const ubah = useUbahProfilPelanggan((pesan) => {
    presentSuccessMessage(pesan ?? 'Profil berhasil diperbarui');
    router.back();
  });
  const simpan = handleValidatedSubmit((nilai: NilaiProfil) => ubah.mutate(nilai));

  return (
    <ScrollView contentContainerStyle={tw`p-4`} keyboardShouldPersistTaps="handled">
      <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
        <FormInput
          name="noTelp"
          control={control}
          label="Nomor Telepon / WhatsApp"
          placeholder="Contoh: 0812 3456 7890"
          keyboardType="phone-pad"
          leftIcon={<Phone size={UKURAN_IKON_TELEPON} color={WARNA_IKON_TELEPON} />}
          error={errors.noTelp?.message}
        />
      </View>
      <View style={tw`bg-white rounded-xl px-4 py-1 shadow-sm mt-4`}>
        <SakelarPreferensi name="isBillNotifEnabled" control={control} label="Pengingat Tagihan" keterangan="Kabar tagihan baru dan jatuh tempo" />
        <View style={tw`h-px bg-gray-100`} />
        <SakelarPreferensi name="isPromoEnabled" control={control} label="Info Promo" keterangan="Penawaran dan promo layanan" />
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: ubah.isPending }}
        disabled={ubah.isPending}
        onPress={simpan}
        style={tw`mt-6 bg-teal-600 rounded-xl py-4 items-center ${ubah.isPending ? 'opacity-70' : ''}`}
      >
        {ubah.isPending ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-bold`}>Simpan Perubahan</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
